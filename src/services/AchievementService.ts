import AsyncStorage from '@react-native-async-storage/async-storage';
import { type DailyData, toDateKey, calcStreak, calcTotals } from '../../lib/storage';

const STORAGE_KEY = '@focusblock/achievements_v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_focus'
  | 'getting_started'
  | 'dedicated'
  | 'focus_master'
  | 'on_fire'
  | 'unstoppable'
  | 'legendary'
  | 'power_hour'
  | 'marathon';

export interface AchievementStats {
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  todayMinutes: number;
}

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  title: string;
  description: string;
  /** Returns true when the achievement condition is met. */
  check: (s: AchievementStats) => boolean;
  /** Returns 0.0–1.0 fraction toward completion. */
  progress: (s: AchievementStats) => number;
  /** Human-readable progress string, e.g. "5 / 25". */
  progressLabel: (s: AchievementStats) => string;
}

export type UnlockedMap = Partial<Record<AchievementId, { unlockedAt: string }>>;

// ── Achievement definitions ───────────────────────────────────────────────────

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first_focus',
    icon: '🎯',
    title: 'First Focus',
    description: 'Complete your first focus session',
    check: (s) => s.totalSessions >= 1,
    progress: (s) => Math.min(1, s.totalSessions),
    progressLabel: (s) => `${Math.min(s.totalSessions, 1)} / 1 session`,
  },
  {
    id: 'getting_started',
    icon: '⭐',
    title: 'Getting Started',
    description: 'Complete 5 focus sessions',
    check: (s) => s.totalSessions >= 5,
    progress: (s) => Math.min(1, s.totalSessions / 5),
    progressLabel: (s) => `${Math.min(s.totalSessions, 5)} / 5`,
  },
  {
    id: 'dedicated',
    icon: '💪',
    title: 'Dedicated',
    description: 'Complete 25 focus sessions',
    check: (s) => s.totalSessions >= 25,
    progress: (s) => Math.min(1, s.totalSessions / 25),
    progressLabel: (s) => `${Math.min(s.totalSessions, 25)} / 25`,
  },
  {
    id: 'focus_master',
    icon: '🏆',
    title: 'Focus Master',
    description: 'Complete 100 focus sessions',
    check: (s) => s.totalSessions >= 100,
    progress: (s) => Math.min(1, s.totalSessions / 100),
    progressLabel: (s) => `${Math.min(s.totalSessions, 100)} / 100`,
  },
  {
    id: 'on_fire',
    icon: '🔥',
    title: 'On Fire',
    description: 'Maintain a 3-day focus streak',
    check: (s) => s.streak >= 3,
    progress: (s) => Math.min(1, s.streak / 3),
    progressLabel: (s) => `${Math.min(s.streak, 3)} / 3 days`,
  },
  {
    id: 'unstoppable',
    icon: '⚡',
    title: 'Unstoppable',
    description: 'Maintain a 7-day focus streak',
    check: (s) => s.streak >= 7,
    progress: (s) => Math.min(1, s.streak / 7),
    progressLabel: (s) => `${Math.min(s.streak, 7)} / 7 days`,
  },
  {
    id: 'legendary',
    icon: '👑',
    title: 'Legendary',
    description: 'Maintain a 30-day focus streak',
    check: (s) => s.streak >= 30,
    progress: (s) => Math.min(1, s.streak / 30),
    progressLabel: (s) => `${Math.min(s.streak, 30)} / 30 days`,
  },
  {
    id: 'power_hour',
    icon: '⏰',
    title: 'Power Hour',
    description: 'Focus for 60+ minutes in a single day',
    check: (s) => s.todayMinutes >= 60,
    progress: (s) => Math.min(1, s.todayMinutes / 60),
    progressLabel: (s) => `${Math.min(s.todayMinutes, 60)} / 60 min`,
  },
  {
    id: 'marathon',
    icon: '🏃',
    title: 'Marathon',
    description: 'Focus for 120+ minutes in a single day',
    check: (s) => s.todayMinutes >= 120,
    progress: (s) => Math.min(1, s.todayMinutes / 120),
    progressLabel: (s) => `${Math.min(s.todayMinutes, 120)} / 120 min`,
  },
] as const;

// ── Storage helpers ───────────────────────────────────────────────────────────

export async function loadUnlocked(): Promise<UnlockedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UnlockedMap) : {};
  } catch {
    return {};
  }
}

async function saveUnlocked(map: UnlockedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

// ── Stats builder ─────────────────────────────────────────────────────────────

/** Derives AchievementStats from the daily session data. */
export function buildAchievementStats(dailyData: DailyData): AchievementStats {
  const { sessions: totalSessions, minutes: totalMinutes } = calcTotals(dailyData);
  const streak = calcStreak(dailyData);
  const today = toDateKey(new Date());
  const todayMinutes = dailyData[today]?.minutes ?? 0;
  return { totalSessions, totalMinutes, streak, todayMinutes };
}

// ── Main check ────────────────────────────────────────────────────────────────

/**
 * Checks all achievement milestones against current session data.
 * Persists any newly unlocked achievements and returns them.
 */
export async function checkAchievements(dailyData: DailyData): Promise<AchievementDef[]> {
  const stats = buildAchievementStats(dailyData);
  const stored = await loadUnlocked();
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of ACHIEVEMENTS) {
    if (stored[def.id]) continue; // already unlocked
    if (def.check(stats)) {
      stored[def.id] = { unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(def);
    }
  }

  if (newlyUnlocked.length > 0) {
    await saveUnlocked(stored);
  }

  return newlyUnlocked;
}
