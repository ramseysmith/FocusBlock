import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TimerSettingsProvider } from '../context/TimerSettings';
import { AudioMixerProvider } from '../context/AudioMixer';

export default function RootLayout() {
  return (
    <TimerSettingsProvider>
      <AudioMixerProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AudioMixerProvider>
    </TimerSettingsProvider>
  );
}
