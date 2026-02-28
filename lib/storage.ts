import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DailyRecord = {
  sessions: number; // focus sessions completed
  minutes: number;  // focus minutes accumulated
};

/** Keyed by ISO date string 'YYYY-MM-DD'. */
export type DailyData = Record<string, DailyRecord>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns a Date at midnight (local) for the given offset from today. */
function dayOffset(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const DAILY_KEY = '@focusblock/daily_v1';

export async function loadDailyData(): Promise<DailyData> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyData) : {};
  } catch {
    return {};
  }
}

export async function recordFocusSession(
  durationMinutes: number
): Promise<DailyData> {
  const today = toDateKey(new Date());
  const data = await loadDailyData();
  const prev = data[today] ?? { sessions: 0, minutes: 0 };

  const next: DailyData = {
    ...data,
    [today]: {
      sessions: prev.sessions + 1,
      minutes: prev.minutes + durationMinutes,
    },
  };

  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(next));
  return next;
}

// ── Derived stats ─────────────────────────────────────────────────────────────

export function calcTotals(data: DailyData): { sessions: number; minutes: number } {
  let sessions = 0;
  let minutes = 0;
  for (const r of Object.values(data)) {
    sessions += r.sessions;
    minutes += r.minutes;
  }
  return { sessions, minutes };
}

/**
 * Current streak = consecutive days ending today (or yesterday if today has
 * no sessions yet) each with ≥ 1 completed session.
 */
export function calcStreak(data: DailyData): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  // If today has no sessions, don't penalise — start counting from yesterday
  if (!(data[toDateKey(date)]?.sessions > 0)) {
    date.setDate(date.getDate() - 1);
  }

  let streak = 0;
  while ((data[toDateKey(date)]?.sessions ?? 0) > 0) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

/**
 * Returns 7 entries for Mon → Sun of the current calendar week.
 * Days in the future have `isFuture: true`.
 */
export type WeekDay = {
  label: string;   // 'Mon', 'Tue', …
  key: string;     // 'YYYY-MM-DD'
  sessions: number;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getWeekData(data: DailyData): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  // Find Monday of the current week
  const dow = today.getDay(); // 0 = Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = toDateKey(date);
    return {
      label: DAY_LABELS[i],
      key,
      sessions: data[key]?.sessions ?? 0,
      minutes: data[key]?.minutes ?? 0,
      isToday: key === todayKey,
      isFuture: date > today,
    };
  });
}

/** Formats minutes as 'Xh Ym', 'Xh', or 'Ym'. */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
