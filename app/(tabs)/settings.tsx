import { View, Text, Switch, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { useTimerSettings } from '../../context/TimerSettings';

type DurationOption = { label: string; minutes: number };

const FOCUS_OPTIONS: DurationOption[] = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

const SHORT_BREAK_OPTIONS: DurationOption[] = [
  { label: '3 min', minutes: 3 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
];

const LONG_BREAK_OPTIONS: DurationOption[] = [
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
];

function RowLabel({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {sub && <Text style={styles.rowSub}>{sub}</Text>}
    </View>
  );
}

function ToggleRow({
  title,
  sub,
  value,
  onChange,
}: {
  title: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <RowLabel title={title} sub={sub} />
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.surfaceHighlight, true: 'rgba(232,168,124,0.5)' }}
        thumbColor={value ? COLORS.accent : 'rgba(255,255,255,0.4)'}
      />
    </View>
  );
}

function DurationPicker({
  options,
  selected,
  onSelect,
}: {
  options: DurationOption[];
  selected: number;
  onSelect: (m: number) => void;
}) {
  return (
    <View style={styles.durationPicker}>
      {options.map((opt) => (
        <Pressable
          key={opt.minutes}
          onPress={() => onSelect(opt.minutes)}
          style={[styles.durationBtn, selected === opt.minutes && styles.durationBtnActive]}
        >
          <Text
            style={[
              styles.durationBtnText,
              selected === opt.minutes && styles.durationBtnTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const {
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
  } = useTimerSettings();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Settings</Text>
        </View>

        {/* Timer durations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timer Durations</Text>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Focus</Text>
            <DurationPicker
              options={FOCUS_OPTIONS}
              selected={focusMins}
              onSelect={setFocusMins}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Short Break</Text>
            <DurationPicker
              options={SHORT_BREAK_OPTIONS}
              selected={shortBreakMins}
              onSelect={setShortBreakMins}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Long Break</Text>
            <DurationPicker
              options={LONG_BREAK_OPTIONS}
              selected={longBreakMins}
              onSelect={setLongBreakMins}
            />
          </View>
        </View>

        {/* Behaviour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behaviour</Text>
          <View style={styles.card}>
            <ToggleRow
              title="Auto-start next session"
              sub="Automatically start break and focus timers"
              value={autoStart}
              onChange={setAutoStart}
            />
            <View style={styles.divider} />
            <ToggleRow
              title="Keep screen awake"
              sub="Prevent screen from sleeping during sessions"
              value={keepAwakeEnabled}
              onChange={setKeepAwakeEnabled}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.aboutWrap}>
          <Text style={styles.aboutText}>FocusBlock v1.0.0</Text>
          <Text style={styles.aboutSub}>Built for deep work</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '400',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: -4,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
  },
  durationBtnActive: {
    backgroundColor: 'rgba(232,168,124,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.4)',
  },
  durationBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  durationBtnTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  aboutWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  aboutText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  aboutSub: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 2,
  },
});
