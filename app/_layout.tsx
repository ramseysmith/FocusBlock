import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { TimerSettingsProvider } from '../context/TimerSettings';
import { AudioMixerProvider } from '../context/AudioMixer';
import { StatsProvider } from '../context/StatsStore';
import { PremiumProvider } from '../context/PremiumContext';
import { AchievementProvider } from '../context/AchievementContext';
import {
  setupAndroidChannels,
  setupNotificationCategories,
  NOTIF_ACTION_START_BREAK,
  NOTIF_ACTION_SKIP_BREAK,
  NOTIF_ACTION_START_FOCUS,
  NOTIF_ACTION_STOP,
} from '../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endAllActivities } from '../lib/liveActivity';
import { cleanupExpiredUnlocks } from '../lib/adStorage';
import { AdManager } from '../src/services/ads/AdManager';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep the native static splash up until we're ready to play the animation.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    async function prepare() {
      setupAndroidChannels();
      setupNotificationCategories();
      AdManager.initialize();
      await cleanupExpiredUnlocks().catch(() => {});
      // Clean up any lingering Live Activities from a previous session
      endAllActivities().catch(() => {});
      setAppIsReady(true);
    }
    prepare();

    // Handle taps on notification action buttons
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (
        action === NOTIF_ACTION_START_BREAK ||
        action === NOTIF_ACTION_SKIP_BREAK  ||
        action === NOTIF_ACTION_START_FOCUS ||
        action === NOTIF_ACTION_STOP
      ) {
        // Store the pending action; TimerScreen reads it on next foreground
        AsyncStorage.setItem('@focusblock/pending_notif_action', action).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // As soon as the app is ready, hide the native splash so the animated one takes over.
  useEffect(() => {
    if (appIsReady) SplashScreen.hideAsync();
  }, [appIsReady]);

  return (
    <PremiumProvider>
      <TimerSettingsProvider>
        <StatsProvider>
          <AchievementProvider>
            <AudioMixerProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>

              {/* Animated splash sits on top of the app until the animation finishes */}
              {appIsReady && !animDone && (
                <AnimatedSplash onFinish={() => setAnimDone(true)} />
              )}
            </AudioMixerProvider>
          </AchievementProvider>
        </StatsProvider>
      </TimerSettingsProvider>
    </PremiumProvider>
  );
}
