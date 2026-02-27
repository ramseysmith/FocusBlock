import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TimerSettingsProvider } from '../context/TimerSettings';

export default function RootLayout() {
  return (
    <TimerSettingsProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </TimerSettingsProvider>
  );
}
