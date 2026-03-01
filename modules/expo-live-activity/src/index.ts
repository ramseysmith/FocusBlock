import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

function getModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule('ExpoLiveActivity');
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveActivityConfig {
  /** Unix timestamp (seconds) when the timer reaches zero. */
  timerEnd: number;
  /** Total session duration in seconds (for circular-progress calculation). */
  totalDuration: number;
  /** "focus" | "shortBreak" | "longBreak" */
  mode: 'focus' | 'shortBreak' | 'longBreak';
  /** false when the timer is paused. */
  isRunning: boolean;
  /** Focus sessions completed today. */
  completedSessions: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if Live Activities are supported and enabled on this device. */
export function isSupported(): boolean {
  return getModule()?.isSupported() ?? false;
}

/**
 * Start a new Live Activity for the current timer session.
 * Returns the activity ID used for subsequent update/end calls.
 * Returns null if Live Activities are unavailable or the call fails.
 */
export async function startActivity(config: LiveActivityConfig): Promise<string | null> {
  try {
    return (await getModule()?.startActivity(config)) ?? null;
  } catch {
    return null;
  }
}

/** Update the running Live Activity with new timer state (e.g. on every tick). */
export async function updateActivity(id: string, config: LiveActivityConfig): Promise<void> {
  try {
    await getModule()?.updateActivity(id, config);
  } catch {
    // ignore — activity may have already ended
  }
}

/**
 * End a specific Live Activity.
 * Pass `finalConfig` to display a completion state before the system dismisses it.
 * Omit `finalConfig` to dismiss immediately.
 */
export async function endActivity(id: string, finalConfig?: LiveActivityConfig): Promise<void> {
  try {
    await getModule()?.endActivity(id, finalConfig ?? null);
  } catch {
    // ignore
  }
}

/** End all active FocusBlock Live Activities (e.g. on app launch). */
export async function endAllActivities(): Promise<void> {
  try {
    await getModule()?.endAllActivities();
  } catch {
    // ignore
  }
}
