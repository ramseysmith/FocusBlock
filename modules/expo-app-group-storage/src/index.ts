import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

function getModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule('ExpoAppGroupStorage');
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WidgetDayData {
  label: string;    // single-letter day label: "M" | "T" | "W" | "T" | "F" | "S" | "S"
  minutes: number;
  isToday: boolean;
}

export interface WidgetData {
  streak: number;
  todayMinutes: number;
  todaySessions: number;
  weekData: WidgetDayData[];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function setString(key: string, value: string): void {
  getModule()?.setString(key, value);
}

export function getString(key: string): string | null {
  return getModule()?.getString(key) ?? null;
}

export function setNumber(key: string, value: number): void {
  getModule()?.setNumber(key, value);
}

export function getNumber(key: string): number | null {
  return getModule()?.getNumber(key) ?? null;
}

export function setJSON(key: string, json: string): void {
  getModule()?.setJSON(key, json);
}

export function getJSON(key: string): string | null {
  return getModule()?.getJSON(key) ?? null;
}

/**
 * Write the full widget data payload to the App Group UserDefaults and
 * trigger a WidgetKit timeline reload so widgets refresh immediately.
 */
export function writeWidgetData(data: WidgetData): void {
  try {
    getModule()?.setJSON('widget_data', JSON.stringify(data));
    getModule()?.reloadWidgets();
  } catch {
    // non-iOS or module not available — safe to ignore
  }
}

/** Trigger a WidgetKit timeline reload without writing new data. */
export function reloadWidgets(): void {
  try {
    getModule()?.reloadWidgets();
  } catch {
    // ignore
  }
}
