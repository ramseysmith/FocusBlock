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
import { setupAndroidChannels } from '../lib/notifications';
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
      AdManager.initialize();
      await cleanupExpiredUnlocks().catch(() => {});
      setAppIsReady(true);
    }
    prepare();

    const sub = Notifications.addNotificationResponseReceivedListener(() => {});
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
