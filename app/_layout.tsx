import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TimerSettingsProvider } from '../context/TimerSettings';
import { AudioMixerProvider } from '../context/AudioMixer';
import { StatsProvider } from '../context/StatsStore';

export default function RootLayout() {
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
