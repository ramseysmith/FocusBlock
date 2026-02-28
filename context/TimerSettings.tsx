import React, { createContext, useContext } from 'react';
import { useSettings, SETTINGS_DEFAULTS, type AppSettings } from '../hooks/useSettings';

// ── Context interface ─────────────────────────────────────────────────────────

export interface SettingsContextValue extends AppSettings {
  isLoaded: boolean;

  // ── Individual typed setters ──────────────────────────────────────────────
  setFocusMins: (m: number) => void;
  setShortBreakMins: (m: number) => void;
  setLongBreakMins: (m: number) => void;
  setSessionsBeforeLongBreak: (n: number) => void;
  setAutoStartBreaks: (v: boolean) => void;
  setAutoStartFocus: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
  setDefaultVolume: (v: number) => void;
  setFadeInDuration: (v: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setSessionCompleteAlert: (v: boolean) => void;
  setBreakReminderEnabled: (v: boolean) => void;
  setDailyReminderEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setReminderMinute: (m: number) => void;

  // ── Backwards-compat aliases (existing consumers unchanged) ───────────────
  /** alias for autoStartBreaks */
  autoStart: boolean;
  /** alias for dailyReminderEnabled */
  reminderEnabled: boolean;
  /** alias for setAutoStartBreaks */
  setAutoStart: (v: boolean) => void;
  /** alias for setDailyReminderEnabled */
  setReminderEnabled: (v: boolean) => void;
}

// ── Default context (before provider mounts) ──────────────────────────────────

const noop = () => {};

const DEFAULT_CTX: SettingsContextValue = {
  ...SETTINGS_DEFAULTS,
  isLoaded: false,
  setFocusMins: noop,
  setShortBreakMins: noop,
  setLongBreakMins: noop,
  setSessionsBeforeLongBreak: noop,
  setAutoStartBreaks: noop,
  setAutoStartFocus: noop,
  setKeepAwakeEnabled: noop,
  setDefaultVolume: noop,
  setFadeInDuration: noop,
  setNotificationsEnabled: noop,
  setSessionCompleteAlert: noop,
  setBreakReminderEnabled: noop,
  setDailyReminderEnabled: noop,
  setReminderHour: noop,
  setReminderMinute: noop,
  autoStart: false,
  reminderEnabled: false,
  setAutoStart: noop,
  setReminderEnabled: noop,
};

// ── Context + provider ────────────────────────────────────────────────────────

const TimerSettingsContext = createContext<SettingsContextValue>(DEFAULT_CTX);

export function TimerSettingsProvider({ children }: { children: React.ReactNode }) {
  const { set, ...settings } = useSettings();

  const value: SettingsContextValue = {
    ...settings,

    // Typed setters
    setFocusMins:                (m) => set('focusMins', m),
    setShortBreakMins:           (m) => set('shortBreakMins', m),
    setLongBreakMins:            (m) => set('longBreakMins', m),
    setSessionsBeforeLongBreak:  (n) => set('sessionsBeforeLongBreak', n),
    setAutoStartBreaks:          (v) => set('autoStartBreaks', v),
    setAutoStartFocus:           (v) => set('autoStartFocus', v),
    setKeepAwakeEnabled:         (v) => set('keepAwakeEnabled', v),
    setDefaultVolume:            (v) => set('defaultVolume', v),
    setFadeInDuration:           (v) => set('fadeInDuration', v),
    setNotificationsEnabled:     (v) => set('notificationsEnabled', v),
    setSessionCompleteAlert:     (v) => set('sessionCompleteAlert', v),
    setBreakReminderEnabled:     (v) => set('breakReminderEnabled', v),
    setDailyReminderEnabled:     (v) => set('dailyReminderEnabled', v),
    setReminderHour:             (h) => set('reminderHour', h),
    setReminderMinute:           (m) => set('reminderMinute', m),

    // Backwards-compat aliases
    autoStart:        settings.autoStartBreaks,
    reminderEnabled:  settings.dailyReminderEnabled,
    setAutoStart:     (v) => set('autoStartBreaks', v),
    setReminderEnabled: (v) => set('dailyReminderEnabled', v),
  };

  return (
    <TimerSettingsContext.Provider value={value}>
      {children}
    </TimerSettingsContext.Provider>
  );
}

export const useTimerSettings = () => useContext(TimerSettingsContext);
