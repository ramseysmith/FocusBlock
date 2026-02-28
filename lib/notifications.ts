import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Foreground display handler ─────────────────────────────────────────────────
// Must be set at module load time (before any notification fires in foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // SDK 55 fields
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Constants ─────────────────────────────────────────────────────────────────

const REMINDER_ID_KEY = '@focusblock/reminder_notif_id';

const TIMER_CHANNEL   = 'focusblock_timer';
const REMINDER_CHANNEL = 'focusblock_reminder';

// ── Android notification channels ─────────────────────────────────────────────

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(TIMER_CHANNEL, {
      name: 'Timer Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A87C',
      enableLights: true,
      enableVibrate: true,
    }),
    Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
    }),
  ]);
}

// ── Permissions ───────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  if (current === 'denied') return false; // already denied — must go to OS settings
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ── Timer notifications ────────────────────────────────────────────────────────

type TimerNotifOptions = {
  isFocus: boolean;
  durationSeconds: number;
  /** Number of focus sessions completed so far in this Pomodoro cycle. */
  focusSessionsCompleted: number;
};

/**
 * Schedules a notification to fire exactly `durationSeconds` from now.
 * Returns the notification ID so it can be cancelled on pause/reset.
 */
export async function scheduleTimerNotification({
  isFocus,
  durationSeconds,
  focusSessionsCompleted,
}: TimerNotifOptions): Promise<string | null> {
  try {
    const title = isFocus ? 'Focus session complete 🎯' : 'Break\'s over ⏰';
    const body = isFocus
      ? focusSessionsCompleted > 0 && focusSessionsCompleted % 4 === 0
        ? 'You\'ve earned a long break. Great work!'
        : 'Take a short break — you deserve it.'
      : 'Ready to focus again?';

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: isFocus ? 'focus_end' : 'break_end' },
        ...(Platform.OS === 'android' && { channelId: TIMER_CHANNEL }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: durationSeconds,
        repeats: false,
      },
    });
  } catch (err) {
    console.warn('[Notifications] scheduleTimerNotification failed:', err);
    return null;
  }
}

export async function cancelNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // notification may have already fired — safe to ignore
  }
}

// ── Daily reminder ────────────────────────────────────────────────────────────

/**
 * Schedules a repeating daily reminder at the given hour:minute (local time).
 * Cancels any previously scheduled reminder first.
 * The ID is persisted in AsyncStorage so it survives app restarts.
 */
export async function scheduleReminder(hour: number, minute: number): Promise<void> {
  await cancelReminder(); // clear any existing reminder
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to focus 🌿',
        body: "You haven't started a session yet today. Small steps count!",
        sound: true,
        data: { type: 'daily_reminder' },
        ...(Platform.OS === 'android' && { channelId: REMINDER_CHANNEL }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  } catch (err) {
    console.warn('[Notifications] scheduleReminder failed:', err);
  }
}

/** Cancels the active daily reminder (if any) and clears its stored ID. */
export async function cancelReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(REMINDER_ID_KEY);
    }
  } catch {
    // ignore — best-effort cleanup
  }
}

/** Clears all delivered notifications from the notification centre. */
export async function dismissDeliveredNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}
