import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useStatsStore } from './StatsStore';
import {
  ACHIEVEMENTS,
  checkAchievements,
  loadUnlocked,
  buildAchievementStats,
  type AchievementDef,
  type UnlockedMap,
  type AchievementStats,
} from '../src/services/AchievementService';
import { AchievementModal } from '../components/achievements/AchievementModal';

// ── Context interface ─────────────────────────────────────────────────────────

interface AchievementContextValue {
  /** Persisted unlock records keyed by achievement id. */
  unlockedMap: UnlockedMap;
  /** Derived stats used for progress display in the UI. */
  achievementStats: AchievementStats;
  /** True once the initial AsyncStorage load has completed. */
  isLoaded: boolean;
}

const DEFAULT: AchievementContextValue = {
  unlockedMap: {},
  achievementStats: { totalSessions: 0, totalMinutes: 0, streak: 0, todayMinutes: 0 },
  isLoaded: false,
};

const AchievementContext = createContext<AchievementContextValue>(DEFAULT);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const { totalSessions, dailyData, isLoaded: statsLoaded } = useStatsStore();

  const [unlockedMap, setUnlockedMap] = useState<UnlockedMap>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [queue, setQueue] = useState<AchievementDef[]>([]);

  // Tracks the session count baseline so we only check on *new* sessions
  const prevSessionsRef = useRef<number | null>(null);
  // Guards against concurrent checks racing each other
  const isCheckingRef = useRef(false);

  // ── Load persisted unlocks once stats are ready ──────────────────────────
  useEffect(() => {
    if (!statsLoaded) return;
    loadUnlocked().then((map) => {
      setUnlockedMap(map);
      setIsLoaded(true);
      // Set baseline without triggering a check
      prevSessionsRef.current = totalSessions;
    });
  }, [statsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Watch for new sessions after initial load ────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const prev = prevSessionsRef.current;
    prevSessionsRef.current = totalSessions;

    // Only trigger if a genuine new session was recorded
    if (prev === null || totalSessions <= prev) return;

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    checkAchievements(dailyData)
      .then((newOnes) => {
        if (newOnes.length === 0) return;
        setUnlockedMap((m) => {
          const next = { ...m };
          for (const a of newOnes) next[a.id] = { unlockedAt: new Date().toISOString() };
          return next;
        });
        setQueue((q) => [...q, ...newOnes]);
      })
      .finally(() => {
        isCheckingRef.current = false;
      });
  }, [totalSessions, isLoaded, dailyData]);

  const dismissCurrent = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const achievementStats = useMemo(() => buildAchievementStats(dailyData), [dailyData]);

  const value = useMemo<AchievementContextValue>(
    () => ({ unlockedMap, achievementStats, isLoaded }),
    [unlockedMap, achievementStats, isLoaded],
  );

  return (
    <AchievementContext.Provider value={value}>
      {children}
      <AchievementModal achievement={queue[0] ?? null} onDismiss={dismissCurrent} />
    </AchievementContext.Provider>
  );
}

export const useAchievements = () => useContext(AchievementContext);

// Re-export for convenience so callers don't need two imports
export { ACHIEVEMENTS };
