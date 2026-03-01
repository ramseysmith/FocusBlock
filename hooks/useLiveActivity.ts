import { useCallback, useRef } from 'react';
import {
  isSupported,
  startActivity,
  updateActivity,
  endActivity,
  endAllActivities,
} from '../lib/liveActivity';
import type { LiveActivityConfig } from '../lib/liveActivity';

/**
 * Hook that manages a single Live Activity for the current timer session.
 *
 * Usage in TimerScreen:
 *   const liveActivity = useLiveActivity();
 *
 *   // On play:
 *   await liveActivity.start({ timerEnd: ..., mode: ..., ... });
 *
 *   // On every second tick (throttled — don't call every tick; call every 5–10s):
 *   await liveActivity.update({ timerEnd: ..., ... });
 *
 *   // On pause/reset/skip:
 *   await liveActivity.end();
 *
 *   // On session complete (shows completion state briefly before dismissal):
 *   await liveActivity.end(finalConfig);
 */
export function useLiveActivity() {
  const activityIdRef = useRef<string | null>(null);

  const start = useCallback(async (config: LiveActivityConfig): Promise<void> => {
    if (!isSupported()) return;
    // End any lingering activity from a previous session
    if (activityIdRef.current) {
      await endActivity(activityIdRef.current);
      activityIdRef.current = null;
    }
    const id = await startActivity(config);
    activityIdRef.current = id;
  }, []);

  const update = useCallback(async (config: LiveActivityConfig): Promise<void> => {
    if (!activityIdRef.current) return;
    await updateActivity(activityIdRef.current, config);
  }, []);

  /**
   * End the active Live Activity.
   * Pass `finalConfig` to display a "session complete" state for a few seconds.
   * Omit it for immediate dismissal (pause / reset / skip).
   */
  const end = useCallback(async (finalConfig?: LiveActivityConfig): Promise<void> => {
    if (!activityIdRef.current) return;
    await endActivity(activityIdRef.current, finalConfig);
    activityIdRef.current = null;
  }, []);

  /** True if there is a currently active Live Activity managed by this hook. */
  const isActive = useCallback((): boolean => activityIdRef.current !== null, []);

  return { start, update, end, endAllActivities, isActive };
}
