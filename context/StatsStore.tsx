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
  type DailyData,
} from '../lib/storage';

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
    loadDailyData().then((data) => {
      setDailyData(data);
      setIsLoaded(true);
    });
  }, []);

  const recordSession = useCallback(async (durationMinutes: number) => {
    const updated = await recordFocusSession(durationMinutes);
    setDailyData(updated);
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
