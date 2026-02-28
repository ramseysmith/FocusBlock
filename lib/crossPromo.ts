import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DISMISSED_UNTIL = '@focusblock/drift_dismissed_until';
const KEY_TAP_COUNT       = '@focusblock/drift_tap_count';

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Dismissal ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the user has dismissed the Drift card and the 7-day
 * window has not yet expired.
 */
export async function isDriftCardDismissed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DISMISSED_UNTIL);
    if (!raw) return false;
    return Date.now() < Number(raw);
  } catch {
    return false;
  }
}

/**
 * Records a dismissal. The card will stay hidden for 7 days from now.
 */
export async function dismissDriftCard(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DISMISSED_UNTIL, String(Date.now() + DISMISS_DURATION_MS));
  } catch {}
}

// ── Tap analytics ─────────────────────────────────────────────────────────────

/**
 * Atomically increments the all-time tap counter and returns the new value.
 * Call this every time the user taps the promo card (before opening the URL).
 */
export async function incrementDriftTapCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TAP_COUNT);
    const next = (raw ? Number(raw) : 0) + 1;
    await AsyncStorage.setItem(KEY_TAP_COUNT, String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Returns the all-time number of times the user has tapped the Drift promo.
 * Useful for surfacing conversion data in a dev/analytics screen.
 */
export async function getDriftTapCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TAP_COUNT);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}
