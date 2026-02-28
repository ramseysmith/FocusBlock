import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { TimerSettingsProvider } from '../context/TimerSettings';
import { AudioMixerProvider } from '../context/AudioMixer';
import { StatsProvider } from '../context/StatsStore';
import { setupAndroidChannels } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Set up Android notification channels (no-op on iOS)
    setupAndroidChannels();

    // Handle taps on delivered notifications — bring app to foreground naturally
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // expo-router handles foreground; no explicit navigation needed here
    });

    return () => sub.remove();
  }, []);

  return (
    <TimerSettingsProvider>
      <StatsProvider>
        <AudioMixerProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AudioMixerProvider>
      </StatsProvider>
    </TimerSettingsProvider>
  );
}
