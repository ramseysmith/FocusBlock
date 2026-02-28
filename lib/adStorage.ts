import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDateKey } from './storage';

// ── Session counter (daily reset at midnight) ─────────────────────────────────

const AD_SESSION_COUNT_KEY = '@focusblock/ad_session_count';
const AD_SESSION_DATE_KEY = '@focusblock/ad_session_date';

/** Returns today's ad session count (resets to 0 if date changed). */
export async function getAdSessionCount(): Promise<number> {
  const today = toDateKey(new Date());
  const [[, count], [, date]] = await AsyncStorage.multiGet([
    AD_SESSION_COUNT_KEY,
    AD_SESSION_DATE_KEY,
  ]);
  if (date !== today) return 0;
  return count ? parseInt(count, 10) : 0;
}

/** Increments and persists today's ad session count. Returns new count. */
export async function incrementAdSessionCount(): Promise<number> {
  const today = toDateKey(new Date());
  const current = await getAdSessionCount();
  const next = current + 1;
  await AsyncStorage.multiSet([
    [AD_SESSION_COUNT_KEY, String(next)],
    [AD_SESSION_DATE_KEY, today],
  ]);
  return next;
}

// ── 24-hour sound unlocks ─────────────────────────────────────────────────────

const SOUND_UNLOCKS_KEY = '@focusblock/sound_unlocks';

type UnlockMap = Record<string, number>; // soundId → expiry ms

async function readUnlockMap(): Promise<UnlockMap> {
  try {
    const raw = await AsyncStorage.getItem(SOUND_UNLOCKS_KEY);
    return raw ? (JSON.parse(raw) as UnlockMap) : {};
  } catch {
    return {};
  }
}

async function writeUnlockMap(map: UnlockMap): Promise<void> {
  await AsyncStorage.setItem(SOUND_UNLOCKS_KEY, JSON.stringify(map));
}

/** Removes entries whose expiry has passed. Safe to call on app launch. */
export async function cleanupExpiredUnlocks(): Promise<void> {
  const map = await readUnlockMap();
  const now = Date.now();
  const cleaned: UnlockMap = {};
  for (const [id, expiry] of Object.entries(map)) {
    if (expiry > now) cleaned[id] = expiry;
  }
  await writeUnlockMap(cleaned);
}

/** Unlocks a sound for the next 24 hours. */
export async function unlockSoundFor24Hours(soundId: string): Promise<void> {
  const map = await readUnlockMap();
  map[soundId] = Date.now() + 86_400_000;
  await writeUnlockMap(map);
}

/** Returns only non-expired unlock entries. */
export async function getActiveUnlocks(): Promise<UnlockMap> {
  const map = await readUnlockMap();
  const now = Date.now();
  const active: UnlockMap = {};
  for (const [id, expiry] of Object.entries(map)) {
    if (expiry > now) active[id] = expiry;
  }
  return active;
}

/** Returns true if the sound is currently unlocked (not expired). */
export async function isSoundUnlocked(soundId: string): Promise<boolean> {
  const map = await readUnlockMap();
  const expiry = map[soundId];
  return expiry !== undefined && expiry > Date.now();
}
