import { requireNativeModule } from 'expo-modules-core';

// Lazily required so the module doesn't throw at import time if the native
// binary wasn't compiled in (e.g. Expo Go). Callers should wrap in try/catch.
function getModule(): NativeExpoUnityAds {
  return requireNativeModule<NativeExpoUnityAds>('ExpoUnityAds');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShowResult {
  /** The placement ID that served the ad. */
  placementId: string;
  /** true if the user watched to completion (reward should be granted). */
  completed: boolean;
}

interface NativeExpoUnityAds {
  initialize(gameId: string, testMode: boolean): Promise<void>;
  load(placementId: string): Promise<void>;
  show(placementId: string): Promise<ShowResult>;
  isInitialized(): boolean;
  isLoaded(placementId: string): boolean;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize the Unity Ads SDK. Must be called once before loading or showing ads.
 * @param gameId  Your Unity game ID from the Unity Dashboard.
 * @param testMode  Pass true during development to get test ads.
 */
export async function initialize(gameId: string, testMode = false): Promise<void> {
  return getModule().initialize(gameId, testMode);
}

/**
 * Pre-load an ad for the given placement. Must succeed before calling `show()`.
 * Unity Ads 4.x requires explicit loads before each show.
 */
export async function load(placementId: string): Promise<void> {
  return getModule().load(placementId);
}

/**
 * Show a loaded ad. Resolves with ShowResult when the user dismisses the ad.
 * `result.completed === true` indicates the user earned a reward (rewarded ads).
 */
export async function show(placementId: string): Promise<ShowResult> {
  return getModule().show(placementId);
}

/** Returns true if the SDK has been successfully initialized. */
export function isInitialized(): boolean {
  return getModule().isInitialized();
}

/** Returns true if an ad is loaded and ready to show for this placement. */
export function isLoaded(placementId: string): boolean {
  return getModule().isLoaded(placementId);
}
