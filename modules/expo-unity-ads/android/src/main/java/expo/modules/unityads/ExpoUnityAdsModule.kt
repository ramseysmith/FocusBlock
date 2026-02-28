package expo.modules.unityads

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsLoadOptions
import com.unity3d.ads.UnityAdsShowOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap

class ExpoUnityAdsModule : Module() {

  /** Tracks which placement IDs have a loaded ad ready to show. */
  private val loadedPlacements: MutableSet<String> = ConcurrentHashMap.newKeySet()

  /** Unity Ads SDK must be initialized and ads must be shown on the main thread. */
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("ExpoUnityAds")

    // ── initialize(gameId, testMode) → Promise<void> ─────────────────────────
    //
    // Unity Ads 4.x requires the Application context (not Activity).
    // The IUnityAdsInitializationListener resolves/rejects the promise.

    AsyncFunction("initialize") { gameId: String, testMode: Boolean, promise: Promise ->
      val context = appContext.reactContext?.applicationContext ?: run {
        promise.reject("ERR_NO_CONTEXT", "Application context not available", null)
        return@AsyncFunction
      }

      mainHandler.post {
        UnityAds.initialize(
          context,
          gameId,
          testMode,
          object : IUnityAdsInitializationListener {
            override fun onInitializationComplete() {
              promise.resolve(null)
            }

            override fun onInitializationFailed(
              error: UnityAds.UnityAdsInitializationError,
              message: String,
            ) {
              promise.reject("ERR_UNITY_INIT", "$error: $message", null)
            }
          }
        )
      }
    }

    // ── load(placementId) → Promise<void> ────────────────────────────────────
    //
    // Unity Ads 4.x requires an explicit load call before every show.
    // Resolves when the ad is cached and ready.

    AsyncFunction("load") { placementId: String, promise: Promise ->
      loadedPlacements.remove(placementId)

      UnityAds.load(
        placementId,
        UnityAdsLoadOptions(),
        object : IUnityAdsLoadListener {
          override fun onUnityAdsAdLoaded(pid: String) {
            loadedPlacements.add(pid)
            promise.resolve(null)
          }

          override fun onUnityAdsFailedToLoad(
            pid: String,
            error: UnityAds.UnityAdsLoadError,
            message: String,
          ) {
            promise.reject("ERR_UNITY_LOAD", "$error: $message", null)
          }
        }
      )
    }

    // ── show(placementId) → Promise<{ placementId, completed }> ──────────────
    //
    // Resolves when the user dismisses the ad.
    // `completed = true` means the user watched to the end → grant reward.

    AsyncFunction("show") { placementId: String, promise: Promise ->
      val activity = appContext.currentActivity ?: run {
        promise.reject("ERR_NO_ACTIVITY", "No current Activity available", null)
        return@AsyncFunction
      }

      loadedPlacements.remove(placementId)

      mainHandler.post {
        UnityAds.show(
          activity,
          placementId,
          UnityAdsShowOptions(),
          object : IUnityAdsShowListener {
            override fun onUnityAdsShowStart(pid: String) {}
            override fun onUnityAdsShowClick(pid: String) {}

            override fun onUnityAdsShowComplete(
              pid: String,
              state: UnityAds.UnityAdsShowCompletionState,
            ) {
              val result = Bundle().apply {
                putString("placementId", pid)
                putBoolean("completed", state == UnityAds.UnityAdsShowCompletionState.COMPLETED)
              }
              promise.resolve(result)
            }

            override fun onUnityAdsShowFailed(
              pid: String,
              error: UnityAds.UnityAdsShowError,
              message: String,
            ) {
              promise.reject("ERR_UNITY_SHOW", "$error: $message", null)
            }
          }
        )
      }
    }

    // ── Synchronous helpers ───────────────────────────────────────────────────

    Function("isInitialized") {
      UnityAds.isInitialized()
    }

    Function("isLoaded") { placementId: String ->
      loadedPlacements.contains(placementId)
    }
  }
}
