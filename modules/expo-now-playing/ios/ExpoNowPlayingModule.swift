import ExpoModulesCore
import MediaPlayer
import AVFoundation

public class ExpoNowPlayingModule: Module {

  // Held to remove targets later; MPRemoteCommand.addTarget returns an opaque Any.
  private var playCommandTarget:  Any?
  private var pauseCommandTarget: Any?

  public func definition() -> ModuleDefinition {
    Name("ExpoNowPlaying")

    Events("onPlay", "onPause")

    // ── Background audio session ──────────────────────────────────────────────
    // Call once when audio playback begins so the OS keeps the audio session
    // active while the app is backgrounded.
    Function("activateAudioSession") {
      let session = AVAudioSession.sharedInstance()
      try? session.setCategory(
        .playback,
        mode: .default,
        options: [.mixWithOthers, .allowBluetooth]
      )
      try? session.setActive(true)
    }

    Function("deactivateAudioSession") {
      try? AVAudioSession.sharedInstance().setActive(
        false,
        options: .notifyOthersOnDeactivation
      )
    }

    // ── Now Playing metadata ──────────────────────────────────────────────────
    Function("updateNowPlaying") { (info: [String: Any]) in
      var np: [String: Any] = [:]
      if let title    = info["title"]    as? String { np[MPMediaItemPropertyTitle]                          = title }
      if let artist   = info["artist"]   as? String { np[MPMediaItemPropertyArtist]                         = artist }
      if let duration = info["duration"] as? Double { np[MPMediaItemPropertyPlaybackDuration]               = duration }
      if let elapsed  = info["elapsed"]  as? Double { np[MPNowPlayingInfoPropertyElapsedPlaybackTime]        = elapsed }
      if let rate     = info["rate"]     as? Float  { np[MPNowPlayingInfoPropertyPlaybackRate]               = rate }
      MPNowPlayingInfoCenter.default().nowPlayingInfo = np
    }

    Function("clearNowPlaying") {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // ── Remote controls (lock screen / Control Centre / AirPods) ─────────────
    Function("enableRemoteControls") {
      let center = MPRemoteCommandCenter.shared()
      center.playCommand.isEnabled  = true
      center.pauseCommand.isEnabled = true
      center.stopCommand.isEnabled  = true

      // Remove stale targets to avoid stacking handlers on repeated calls
      if let t = self.playCommandTarget  { center.playCommand.removeTarget(t)  }
      if let t = self.pauseCommandTarget { center.pauseCommand.removeTarget(t) }

      self.playCommandTarget = center.playCommand.addTarget { [weak self] _ in
        self?.sendEvent("onPlay")
        return .success
      }
      self.pauseCommandTarget = center.pauseCommand.addTarget { [weak self] _ in
        self?.sendEvent("onPause")
        return .success
      }
    }

    Function("disableRemoteControls") {
      let center = MPRemoteCommandCenter.shared()
      center.playCommand.isEnabled  = false
      center.pauseCommand.isEnabled = false
      center.stopCommand.isEnabled  = false
      if let t = self.playCommandTarget  { center.playCommand.removeTarget(t)  }
      if let t = self.pauseCommandTarget { center.pauseCommand.removeTarget(t) }
      self.playCommandTarget  = nil
      self.pauseCommandTarget = nil
    }
  }
}
