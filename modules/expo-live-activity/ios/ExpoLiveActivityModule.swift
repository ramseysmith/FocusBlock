import ExpoModulesCore
import ActivityKit

// ── Shared model ──────────────────────────────────────────────────────────────
// TimerActivityAttributes drives the Live Activity and Dynamic Island views.
// The widget extension (FocusBlockWidgetExtension/TimerLiveActivity.swift)
// contains an identical copy of this struct — property names must stay in sync.

@available(iOS 16.2, *)
struct TimerActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Unix timestamp (seconds since 1970) when the timer counts to zero.
    var timerEnd: Double
    /// Original duration of this session in seconds (used for circular progress).
    var totalDuration: Int
    /// "focus" | "shortBreak" | "longBreak"
    var mode: String
    /// false when the timer is paused.
    var isRunning: Bool
    /// Focus sessions completed today (shown as a badge).
    var completedSessions: Int
  }
  /// Human-readable label shown in the expanded Dynamic Island and lock screen.
  var sessionLabel: String
}

// ── Module ────────────────────────────────────────────────────────────────────

public class ExpoLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoLiveActivity")

    // ── isSupported() -> Bool ─────────────────────────────────────────────────
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    // ── startActivity(config) -> String ──────────────────────────────────────
    AsyncFunction("startActivity") { (config: [String: Any], promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.reject("ERR_NOT_SUPPORTED", "Live Activities require iOS 16.2+")
        return
      }
      do {
        let state   = contentState(from: config)
        let attrs   = TimerActivityAttributes(sessionLabel: sessionLabel(from: config))
        let content = ActivityContent(state: state, staleDate: nil)
        let activity = try Activity.request(
          attributes: attrs,
          content: content,
          pushType: nil
        )
        promise.resolve(activity.id)
      } catch {
        promise.reject("ERR_LIVE_ACTIVITY_START", error.localizedDescription)
      }
    }

    // ── updateActivity(id, config) ────────────────────────────────────────────
    AsyncFunction("updateActivity") { (activityId: String, config: [String: Any], promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil); return
      }
      guard let activity = Activity<TimerActivityAttributes>.activities
              .first(where: { $0.id == activityId }) else {
        promise.resolve(nil); return   // already ended — not an error
      }
      let newState = contentState(from: config)
      Task {
        await activity.update(ActivityContent(state: newState, staleDate: nil))
        promise.resolve(nil)
      }
    }

    // ── endActivity(id, config?) ──────────────────────────────────────────────
    // Pass a final config to show a completion state before dismissal.
    // Pass nil to dismiss immediately without a completion state.
    AsyncFunction("endActivity") { (activityId: String, config: [String: Any]?, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil); return
      }
      guard let activity = Activity<TimerActivityAttributes>.activities
              .first(where: { $0.id == activityId }) else {
        promise.resolve(nil); return
      }
      Task {
        if let cfg = config {
          let finalContent = ActivityContent(state: contentState(from: cfg), staleDate: nil)
          await activity.end(finalContent, dismissalPolicy: .default)
        } else {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        promise.resolve(nil)
      }
    }

    // ── endAllActivities() ────────────────────────────────────────────────────
    AsyncFunction("endAllActivities") { (promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil); return
      }
      Task {
        for activity in Activity<TimerActivityAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        promise.resolve(nil)
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

@available(iOS 16.2, *)
private func contentState(from config: [String: Any]) -> TimerActivityAttributes.ContentState {
  TimerActivityAttributes.ContentState(
    timerEnd:          (config["timerEnd"]          as? Double) ?? 0,
    totalDuration:     (config["totalDuration"]     as? Int)    ?? 1500,
    mode:              (config["mode"]              as? String) ?? "focus",
    isRunning:         (config["isRunning"]         as? Bool)   ?? true,
    completedSessions: (config["completedSessions"] as? Int)    ?? 0
  )
}

private func sessionLabel(from config: [String: Any]) -> String {
  switch config["mode"] as? String {
  case "shortBreak": return "Short Break"
  case "longBreak":  return "Long Break"
  default:           return "Focus"
  }
}
