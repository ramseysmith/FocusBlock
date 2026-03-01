import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  loadDailyData,
  recordFocusSession,
  calcStreak,
  calcTotals,
  getWeekData,
  toDateKey,
  type DailyData,
} from '../lib/storage';
import { writeWidgetData } from '../lib/appGroupStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

type StatsContextValue = {
  dailyData: DailyData;
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  isLoaded: boolean;
  /** Call when a focus session completes. durationMinutes = mode duration in minutes. */
  recordSession: (durationMinutes: number) => Promise<void>;
};

// ── Context ───────────────────────────────────────────────────────────────────

const StatsContext = createContext<StatsContextValue>({
  dailyData: {},
  totalSessions: 0,
  totalMinutes: 0,
  streak: 0,
  isLoaded: false,
  recordSession: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    loadDailyData()
      .then((data) => {
        setDailyData(data);
      })
      .catch(() => {
        // Storage failure — proceed with empty data rather than staying stuck
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const recordSession = useCallback(async (durationMinutes: number) => {
    const updated = await recordFocusSession(durationMinutes);
    setDailyData(updated);
    // Push fresh data to App Group so lock-screen widgets update immediately
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const week = getWeekData(updated, 0);
    const todayKey = toDateKey(new Date());
    const todayRecord = updated[todayKey] ?? { sessions: 0, minutes: 0 };
    writeWidgetData({
      streak:        calcStreak(updated),
      todayMinutes:  todayRecord.minutes,
      todaySessions: todayRecord.sessions,
      weekData:      week.map((d, i) => ({
        label:   dayLabels[i] ?? d.label[0],
        minutes: d.minutes,
        isToday: d.isToday,
      })),
    });
  }, []);

  const { sessions: totalSessions, minutes: totalMinutes } = calcTotals(dailyData);
  const streak = calcStreak(dailyData);

  return (
    <StatsContext.Provider
      value={{ dailyData, totalSessions, totalMinutes, streak, isLoaded, recordSession }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export const useStatsStore = () => useContext(StatsContext);
