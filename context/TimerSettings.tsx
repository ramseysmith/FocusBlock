import React, { createContext, useContext, useState } from 'react';

interface Settings {
  // Timer durations
  focusMins: number;
  shortBreakMins: number;
  longBreakMins: number;
  // Behaviour
  autoStart: boolean;
  keepAwakeEnabled: boolean;
  // Notifications
  notificationsEnabled: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

interface SettingsContextValue extends Settings {
  setFocusMins: (m: number) => void;
  setShortBreakMins: (m: number) => void;
  setLongBreakMins: (m: number) => void;
  setAutoStart: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setReminderEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setReminderMinute: (m: number) => void;
}

const TimerSettingsContext = createContext<SettingsContextValue>({
  focusMins: 25,
  shortBreakMins: 5,
  longBreakMins: 15,
  autoStart: false,
  keepAwakeEnabled: true,
  notificationsEnabled: true,
  reminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  setFocusMins: () => {},
  setShortBreakMins: () => {},
  setLongBreakMins: () => {},
  setAutoStart: () => {},
  setKeepAwakeEnabled: () => {},
  setNotificationsEnabled: () => {},
  setReminderEnabled: () => {},
  setReminderHour: () => {},
  setReminderMinute: () => {},
});

export function TimerSettingsProvider({ children }: { children: React.ReactNode }) {
  const [focusMins, setFocusMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [autoStart, setAutoStart] = useState(false);
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);

  return (
    <TimerSettingsContext.Provider
      value={{
        focusMins,
        shortBreakMins,
        longBreakMins,
        autoStart,
        keepAwakeEnabled,
        notificationsEnabled,
        reminderEnabled,
        reminderHour,
        reminderMinute,
        setFocusMins,
        setShortBreakMins,
        setLongBreakMins,
        setAutoStart,
        setKeepAwakeEnabled,
        setNotificationsEnabled,
        setReminderEnabled,
        setReminderHour,
        setReminderMinute,
      }}
    >
      {children}
    </TimerSettingsContext.Provider>
  );
}

export const useTimerSettings = () => useContext(TimerSettingsContext);
