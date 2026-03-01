import ExpoModulesCore
import UnityAds

// Strong references to delegates prevent ARC from releasing them before the
// async callback fires. Keyed by placementId for concurrent load operations.
private var gInitDelegate: UnityInitDelegate?
private var gLoadDelegates: [String: UnityLoadDelegate] = [:]
private var gShowDelegates: [String: UnityShowDelegate] = [:]
private var gLoadedPlacements: Set<String> = []

public class ExpoUnityAdsModule: Module {

  public func definition() -> ModuleDefinition {
    Name("ExpoUnityAds")

    // ── initialize(gameId, testMode) ────────────────────────────────────────

    AsyncFunction("initialize") { (gameId: String, testMode: Bool, promise: Promise) in
      let delegate = UnityInitDelegate(
        onComplete: {
          gInitDelegate = nil
          promise.resolve(nil)
        },
        onFailed: { error, message in
          gInitDelegate = nil
          promise.reject("ERR_UNITY_INIT", "\(error.rawValue): \(message)")
        }
      )
      gInitDelegate = delegate

      // Unity Ads iOS SDK must be initialized on the main thread
      DispatchQueue.main.async {
        UnityAds.initialize(gameId, testMode: testMode, initializationDelegate: delegate)
      }
    }

    // ── load(placementId) ───────────────────────────────────────────────────

    AsyncFunction("load") { (placementId: String, promise: Promise) in
      let delegate = UnityLoadDelegate(
        onLoaded: {
          gLoadDelegates.removeValue(forKey: placementId)
          gLoadedPlacements.insert(placementId)
          promise.resolve(nil)
        },
        onFailed: { error, message in
          gLoadDelegates.removeValue(forKey: placementId)
          promise.reject("ERR_UNITY_LOAD", "\(error.rawValue): \(message)")
        }
      )
      gLoadDelegates[placementId] = delegate
      UnityAds.load(placementId, options: UADSLoadOptions(), loadDelegate: delegate)
    }

    // ── show(placementId) ────────────────────────────────────────────────────

    AsyncFunction("show") { (placementId: String, promise: Promise) in
      let delegate = UnityShowDelegate(
        onComplete: { completed in
          gShowDelegates.removeValue(forKey: placementId)
          gLoadedPlacements.remove(placementId)
          promise.resolve([
            "placementId": placementId,
            "completed": completed,
          ])
        },
        onFailed: { error, message in
          gShowDelegates.removeValue(forKey: placementId)
          gLoadedPlacements.remove(placementId)
          promise.reject("ERR_UNITY_SHOW", "\(error.rawValue): \(message)")
        }
      )
      gShowDelegates[placementId] = delegate

      DispatchQueue.main.async {
        guard
          let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let vc = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        else {
          gShowDelegates.removeValue(forKey: placementId)
          promise.reject("ERR_NO_VC", "Could not obtain root view controller")
          return
        }
        UnityAds.show(vc, placementId: placementId, options: UADSShowOptions(),
                      showDelegate: delegate)
      }
    }

    // ── Synchronous helpers ─────────────────────────────────────────────────

    Function("isInitialized") {
      UnityAds.isInitialized()
    }

    Function("isLoaded") { (placementId: String) -> Bool in
      gLoadedPlacements.contains(placementId)
    }
  }
}

// MARK: - Private delegate wrappers ──────────────────────────────────────────
// NSObject conformance is required because Unity Ads delegates are ObjC protocols.

private class UnityInitDelegate: NSObject, UnityAdsInitializationDelegate {
  private let onComplete: () -> Void
  private let onFailed: (UnityAdsInitializationError, String) -> Void

  init(onComplete: @escaping () -> Void,
       onFailed: @escaping (UnityAdsInitializationError, String) -> Void) {
    self.onComplete = onComplete
    self.onFailed = onFailed
  }

  func initializationComplete() { onComplete() }
  func initializationFailed(_ error: UnityAdsInitializationError, withMessage message: String) {
    onFailed(error, message)
  }
}

private class UnityLoadDelegate: NSObject, UnityAdsLoadDelegate {
  private let onLoaded: () -> Void
  private let onFailed: (UnityAdsLoadError, String) -> Void

  init(onLoaded: @escaping () -> Void,
       onFailed: @escaping (UnityAdsLoadError, String) -> Void) {
    self.onLoaded = onLoaded
    self.onFailed = onFailed
  }

  func unityAdsAdLoaded(_ placementId: String) { onLoaded() }
  func unityAdsAdFailed(toLoad placementId: String,
                        withError error: UnityAdsLoadError,
                        withMessage message: String) {
    onFailed(error, message)
  }
}

private class UnityShowDelegate: NSObject, UnityAdsShowDelegate {
  private let onComplete: (Bool) -> Void
  private let onFailed: (UnityAdsShowError, String) -> Void

  init(onComplete: @escaping (Bool) -> Void,
       onFailed: @escaping (UnityAdsShowError, String) -> Void) {
    self.onComplete = onComplete
    self.onFailed = onFailed
  }

  func unityAdsShowStart(_ placementId: String) {}
  func unityAdsShowClick(_ placementId: String) {}

  func unityAdsShowComplete(_ placementId: String,
                             withFinish state: UnityAdsShowCompletionState) {
    onComplete(state == UnityAdsShowCompletionState.showCompletionStateCompleted)
  }

  func unityAdsShowFailed(_ placementId: String,
                           withError error: UnityAdsShowError,
                           withMessage message: String) {
    onFailed(error, message)
  }
}
