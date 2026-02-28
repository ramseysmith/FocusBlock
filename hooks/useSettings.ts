import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Schema ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@focusblock/settings_v2';

export interface AppSettings {
  // ── Timer ────────────────────────────────────────────────────────────────────
  focusMins: number;                  // default: 25
  shortBreakMins: number;             // default: 5
  longBreakMins: number;              // default: 15
  sessionsBeforeLongBreak: number;    // default: 4
  autoStartBreaks: boolean;           // auto-start break after focus ends
  autoStartFocus: boolean;            // auto-start focus after break ends
  keepAwakeEnabled: boolean;          // prevent screen sleep during sessions
  hapticPulseEnabled: boolean;        // subtle haptic nudge every 5 min during focus
  // ── Sound ────────────────────────────────────────────────────────────────────
  defaultVolume: number;              // 0.0–1.0, default 0.7
  fadeInDuration: number;             // seconds 0–10, default 0
  // ── Notifications ────────────────────────────────────────────────────────────
  notificationsEnabled: boolean;      // master toggle + OS permission gate
  sessionCompleteAlert: boolean;      // notify when focus session ends
  breakReminderEnabled: boolean;      // notify when break session ends
  dailyReminderEnabled: boolean;      // daily motivational reminder
  reminderHour: number;               // 0–23
  reminderMinute: number;             // 0–59
}

export const SETTINGS_DEFAULTS: AppSettings = {
  focusMins: 25,
  shortBreakMins: 5,
  longBreakMins: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  keepAwakeEnabled: true,
  hapticPulseEnabled: false,
  defaultVolume: 0.7,
  fadeInDuration: 0,
  notificationsEnabled: true,
  sessionCompleteAlert: true,
  breakReminderEnabled: false,
  dailyReminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
};

// ── Persistence helpers ───────────────────────────────────────────────────────

async function loadFromStorage(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    return { ...SETTINGS_DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

async function saveToStorage(s: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSettingsReturn extends AppSettings {
  /** True once the initial AsyncStorage load has completed. */
  isLoaded: boolean;
  /** Update a single setting and immediately persist to storage. */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void;
}

/**
 * AsyncStorage-backed settings hook.
 * Call once from TimerSettingsProvider; all consumers read via useTimerSettings().
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>({ ...SETTINGS_DEFAULTS });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage().then((loaded) => {
      setSettings(loaded);
      setIsLoaded(true);
    });
  }, []);

  const set = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(next);
      return next;
    });
  }, []);

  return { ...settings, isLoaded, set };
}
