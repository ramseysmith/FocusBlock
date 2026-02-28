import { useState, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { useTimerSettings } from '../../context/TimerSettings';
import {
  requestPermissions,
  scheduleReminder,
  cancelReminder,
} from '../../lib/notifications';
import { usePremium } from '../../context/PremiumContext';
import { PaywallModal } from '../../components/paywall/PaywallModal';

// ── Data ──────────────────────────────────────────────────────────────────────

type DurationOption = { label: string; minutes: number };

const FOCUS_OPTIONS: DurationOption[] = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

const SHORT_BREAK_OPTIONS: DurationOption[] = [
  { label: '3 min',  minutes: 3  },
  { label: '5 min',  minutes: 5  },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
];

const LONG_BREAK_OPTIONS: DurationOption[] = [
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
];

type ReminderTime = { label: string; hour: number; minute: number };

const REMINDER_TIMES: ReminderTime[] = [
  { label: '6 AM',  hour: 6,  minute: 0 },
  { label: '7 AM',  hour: 7,  minute: 0 },
  { label: '8 AM',  hour: 8,  minute: 0 },
  { label: '9 AM',  hour: 9,  minute: 0 },
  { label: '10 AM', hour: 10, minute: 0 },
  { label: '12 PM', hour: 12, minute: 0 },
  { label: '2 PM',  hour: 14, minute: 0 },
  { label: '5 PM',  hour: 17, minute: 0 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

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
  isPremium,
  onUpgrade,
}: {
  options: DurationOption[];
  selected: number;
  onSelect: (m: number) => void;
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  const isCustom = !options.some((o) => o.minutes === selected);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleCustomTap = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    setInputValue(isCustom ? String(selected) : '');
    setInputError(false);
    setShowInput((prev) => !prev);
  };

  const handleInputSubmit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) {
      setInputError(true);
      return;
    }
    onSelect(parsed);
    setShowInput(false);
    setInputError(false);
  };

  const customLabel = isCustom ? `${selected}m` : 'Custom ✦';

  return (
    <View>
      <View style={styles.durationPicker}>
        {options.map((opt) => (
          <Pressable
            key={opt.minutes}
            onPress={() => { onSelect(opt.minutes); setShowInput(false); }}
            style={[styles.chip, selected === opt.minutes && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected === opt.minutes && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={handleCustomTap}
          style={[styles.chip, isCustom && styles.chipActive, styles.chipCustom]}
        >
          <Text style={[styles.chipText, isCustom && styles.chipTextActive, styles.chipCustomText]}>
            {customLabel}
          </Text>
        </Pressable>
      </View>

      {showInput && (
        <View style={styles.customInputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.customInput, inputError && styles.customInputError]}
            value={inputValue}
            onChangeText={(t) => { setInputValue(t); setInputError(false); }}
            placeholder="1–240 min"
            placeholderTextColor={COLORS.textDim}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="done"
            onSubmitEditing={handleInputSubmit}
            autoFocus
          />
          <Pressable style={styles.customInputBtn} onPress={handleInputSubmit}>
            <Text style={styles.customInputBtnText}>Set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ReminderTimePicker({
  selectedHour,
  selectedMinute,
  onSelect,
}: {
  selectedHour: number;
  selectedMinute: number;
  onSelect: (h: number, m: number) => void;
}) {
  return (
    <View style={styles.reminderTimeRow}>
      {REMINDER_TIMES.map((t) => {
        const active = t.hour === selectedHour && t.minute === selectedMinute;
        return (
          <Pressable
            key={t.label}
            onPress={() => onSelect(t.hour, t.minute)}
            style={[styles.timeChip, active && styles.timeChipActive]}
          >
            <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const {
    focusMins, shortBreakMins, longBreakMins,
    autoStart, keepAwakeEnabled,
    notificationsEnabled, reminderEnabled, reminderHour, reminderMinute,
    setFocusMins, setShortBreakMins, setLongBreakMins,
    setAutoStart, setKeepAwakeEnabled,
    setNotificationsEnabled, setReminderEnabled, setReminderHour, setReminderMinute,
  } = useTimerSettings();

  const { isPremium } = usePremium();
  const [paywallVisible, setPaywallVisible] = useState(false);

  // ── Notification permission helpers ───────────────────────────────────────

  const ensurePermissions = async (): Promise<boolean> => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Notifications disabled',
        'Please enable notifications for FocusBlock in your device Settings.',
        [{ text: 'OK' }]
      );
    }
    return granted;
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensurePermissions();
      if (!granted) return;
    }
    setNotificationsEnabled(enabled);
    if (!enabled && reminderEnabled) {
      setReminderEnabled(false);
      await cancelReminder();
    }
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensurePermissions();
      if (!granted) return;
      setReminderEnabled(true);
      await scheduleReminder(reminderHour, reminderMinute);
    } else {
      setReminderEnabled(false);
      await cancelReminder();
    }
  };

  const handleReminderTimeChange = async (hour: number, minute: number) => {
    setReminderHour(hour);
    setReminderMinute(minute);
    if (reminderEnabled) {
      await scheduleReminder(hour, minute);
    }
  };

  const handleDevResetPremium = async () => {
    const { MockPurchaseAdapter } = await import('../../src/services/purchases/adapters/MockPurchaseAdapter');
    await MockPurchaseAdapter.resetPremium();
    Alert.alert('Premium Reset', 'Restart the app to apply the change.');
  };

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
            <Text style={styles.pickerLabel}>Focus</Text>
            <DurationPicker
              options={FOCUS_OPTIONS}
              selected={focusMins}
              onSelect={setFocusMins}
              isPremium={isPremium}
              onUpgrade={() => setPaywallVisible(true)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.pickerLabel}>Short Break</Text>
            <DurationPicker
              options={SHORT_BREAK_OPTIONS}
              selected={shortBreakMins}
              onSelect={setShortBreakMins}
              isPremium={isPremium}
              onUpgrade={() => setPaywallVisible(true)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.pickerLabel}>Long Break</Text>
            <DurationPicker
              options={LONG_BREAK_OPTIONS}
              selected={longBreakMins}
              onSelect={setLongBreakMins}
              isPremium={isPremium}
              onUpgrade={() => setPaywallVisible(true)}
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

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.card}>
            <ToggleRow
              title="Session complete"
              sub="Alert when a focus session or break ends"
              value={notificationsEnabled}
              onChange={handleToggleNotifications}
            />
            <View style={styles.divider} />

            <View style={[!notificationsEnabled && styles.disabledSection]}>
              <ToggleRow
                title="Daily reminder"
                sub="Nudge if you haven't focused yet today"
                value={reminderEnabled && notificationsEnabled}
                onChange={notificationsEnabled ? handleToggleReminder : () => {}}
              />

              {reminderEnabled && notificationsEnabled && (
                <View style={styles.reminderTimeWrap}>
                  <Text style={styles.reminderTimeLabel}>Remind me at</Text>
                  <ReminderTimePicker
                    selectedHour={reminderHour}
                    selectedMinute={reminderMinute}
                    onSelect={handleReminderTimeChange}
                  />
                </View>
              )}
            </View>
          </View>

          {reminderEnabled && notificationsEnabled && (
            <Text style={styles.reminderHint}>
              You'll get a daily nudge at {REMINDER_TIMES.find(
                (t) => t.hour === reminderHour && t.minute === reminderMinute
              )?.label ?? `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`} if you haven't started a session.
            </Text>
          )}
        </View>

        {/* About */}
        <View style={styles.aboutWrap}>
          <Text style={styles.aboutText}>FocusBlock v1.0.0</Text>
          <Text style={styles.aboutSub}>Built for deep work</Text>
        </View>

        {/* Dev-only: reset premium */}
        {__DEV__ && (
          <Pressable style={styles.devResetBtn} onPress={handleDevResetPremium}>
            <Text style={styles.devResetText}>Reset Premium (DEV)</Text>
          </Pressable>
        )}
      </ScrollView>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, paddingBottom: 48 },

  header: { paddingTop: 16, paddingBottom: 24 },
  screenTitle: { fontSize: 22, fontWeight: '600', color: COLORS.textSecondary },

  section: { marginBottom: 24 },
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
  rowTitle: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '400', marginBottom: 2 },
  rowSub: { fontSize: 12, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.surfaceBorder, marginHorizontal: -4 },

  // Duration chips
  pickerLabel: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '400', marginTop: 14 },
  durationPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(232,168,124,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.4)',
  },
  chipCustom: {
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.2)',
    borderStyle: 'dashed',
  },
  chipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '400' },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
  chipCustomText: { color: COLORS.accent },

  // Custom duration input
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  customInputError: {
    borderColor: 'rgba(220,80,80,0.6)',
  },
  customInputBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(232,168,124,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.4)',
  },
  customInputBtnText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Reminder time picker
  disabledSection: { opacity: 0.38, pointerEvents: 'none' },
  reminderTimeWrap: { paddingBottom: 14 },
  reminderTimeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
    marginTop: 2,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceHighlight,
  },
  timeChipActive: {
    backgroundColor: 'rgba(232,168,124,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.4)',
  },
  timeChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '400' },
  timeChipTextActive: { color: COLORS.accent, fontWeight: '600' },

  reminderHint: {
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 17,
    marginTop: -4,
    paddingHorizontal: 4,
  },

  aboutWrap: { alignItems: 'center', paddingTop: 8 },
  aboutText: { fontSize: 13, color: COLORS.textMuted },
  aboutSub: { fontSize: 12, color: COLORS.textDim, marginTop: 2 },

  // Dev toggle
  devResetBtn: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220,80,80,0.3)',
    backgroundColor: 'rgba(220,80,80,0.07)',
  },
  devResetText: {
    fontSize: 12,
    color: 'rgba(220,80,80,0.7)',
    fontWeight: '500',
  },
});
