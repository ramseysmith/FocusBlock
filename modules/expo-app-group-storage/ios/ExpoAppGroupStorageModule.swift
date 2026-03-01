import ExpoModulesCore
import WidgetKit

private let APP_GROUP_ID = "group.com.ramseysmith.focusblock"

public class ExpoAppGroupStorageModule: Module {

  private var defaults: UserDefaults? {
    UserDefaults(suiteName: APP_GROUP_ID)
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoAppGroupStorage")

    // ── String ─────────────────────────────────────────────────────────────
    Function("setString") { (key: String, value: String) in
      self.defaults?.set(value, forKey: key)
    }

    Function("getString") { (key: String) -> String? in
      self.defaults?.string(forKey: key)
    }

    // ── Number ─────────────────────────────────────────────────────────────
    Function("setNumber") { (key: String, value: Double) in
      self.defaults?.set(value, forKey: key)
    }

    Function("getNumber") { (key: String) -> Double? in
      self.defaults?.object(forKey: key) as? Double
    }

    // ── JSON blob (arbitrary Codable data serialised as a JSON string) ──────
    Function("setJSON") { (key: String, json: String) in
      self.defaults?.set(json, forKey: key)
    }

    Function("getJSON") { (key: String) -> String? in
      self.defaults?.string(forKey: key)
    }

    // ── Trigger widget timeline refresh ────────────────────────────────────
    Function("reloadWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
