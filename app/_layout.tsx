import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { TimerSettingsProvider } from '../context/TimerSettings';
import { AudioMixerProvider } from '../context/AudioMixer';
import { StatsProvider } from '../context/StatsStore';
import { PremiumProvider } from '../context/PremiumContext';
import { AchievementProvider } from '../context/AchievementContext';
import { setupAndroidChannels } from '../lib/notifications';
import { cleanupExpiredUnlocks } from '../lib/adStorage';
import { AdManager } from '../src/services/ads/AdManager';

export default function RootLayout() {
  useEffect(() => {
    // Set up Android notification channels (no-op on iOS)
    setupAndroidChannels();

    // Initialize ad SDK (falls back to mock on error)
    AdManager.initialize();

    // Remove expired sound unlocks
    cleanupExpiredUnlocks().catch(() => {});

    // Handle taps on delivered notifications — bring app to foreground naturally
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // expo-router handles foreground; no explicit navigation needed here
    });

    return () => sub.remove();
  }, []);

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
          </AudioMixerProvider>
          </AchievementProvider>
        </StatsProvider>
      </TimerSettingsProvider>
    </PremiumProvider>
  );
}
