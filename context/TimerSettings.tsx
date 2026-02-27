import React, { createContext, useContext, useState } from 'react';

interface Settings {
  focusMins: number;
  shortBreakMins: number;
  longBreakMins: number;
  autoStart: boolean;
  keepAwakeEnabled: boolean;
}

interface SettingsContextValue extends Settings {
  setFocusMins: (m: number) => void;
  setShortBreakMins: (m: number) => void;
  setLongBreakMins: (m: number) => void;
  setAutoStart: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
}

const TimerSettingsContext = createContext<SettingsContextValue>({
  focusMins: 25,
  shortBreakMins: 5,
  longBreakMins: 15,
  autoStart: false,
  keepAwakeEnabled: true,
  setFocusMins: () => {},
  setShortBreakMins: () => {},
  setLongBreakMins: () => {},
  setAutoStart: () => {},
  setKeepAwakeEnabled: () => {},
});

export function TimerSettingsProvider({ children }: { children: React.ReactNode }) {
  const [focusMins, setFocusMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [autoStart, setAutoStart] = useState(false);
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(true);

  return (
    <TimerSettingsContext.Provider
      value={{
        focusMins,
        shortBreakMins,
        longBreakMins,
        autoStart,
        keepAwakeEnabled,
        setFocusMins,
        setShortBreakMins,
        setLongBreakMins,
        setAutoStart,
        setKeepAwakeEnabled,
      }}
    >
      {children}
    </TimerSettingsContext.Provider>
  );
}

export const useTimerSettings = () => useContext(TimerSettingsContext);
