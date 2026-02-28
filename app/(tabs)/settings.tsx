import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS } from '../../constants/theme';
import { useTimerSettings } from '../../context/TimerSettings';
import {
  requestPermissions,
  scheduleReminder,
  cancelReminder,
} from '../../lib/notifications';
import { usePremium } from '../../context/PremiumContext';
import { PaywallModal } from '../../components/paywall/PaywallModal';

// ── External links (replace with real URLs before shipping) ───────────────────

const APP_STORE_URL  = 'https://apps.apple.com/app/id000000000';
const PRIVACY_URL    = 'https://example.com/privacy';
const TERMS_URL      = 'https://example.com/terms';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ── Reminder time presets ─────────────────────────────────────────────────────

const REMINDER_TIMES = [
  { label: '6 AM',  hour: 6,  minute: 0 },
  { label: '7 AM',  hour: 7,  minute: 0 },
  { label: '8 AM',  hour: 8,  minute: 0 },
  { label: '9 AM',  hour: 9,  minute: 0 },
  { label: '10 AM', hour: 10, minute: 0 },
  { label: '12 PM', hour: 12, minute: 0 },
  { label: '2 PM',  hour: 14, minute: 0 },
  { label: '5 PM',  hour: 17, minute: 0 },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── SettingRow ────────────────────────────────────────────────────────────────

function SettingRow({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

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
    <SettingRow
      title={title}
      sub={sub}
      right={
        <Switch
          value={value}
          onValueChange={(v) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(v);
          }}
          trackColor={{ false: COLORS.surfaceHighlight, true: 'rgba(232,168,124,0.5)' }}
          thumbColor={value ? COLORS.accent : 'rgba(255,255,255,0.4)'}
        />
      }
    />
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** When true: show locked state with Pro badge */
  locked?: boolean;
  onUnlock?: () => void;
}

function Stepper({ value, min, max, step, format, onChange, locked, onUnlock }: StepperProps) {
  if (locked) {
    return (
      <View style={styles.stepperLocked}>
        <Text style={styles.stepperLockedValue}>{format(value)}</Text>
        <Pressable style={styles.proBadge} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUnlock?.();
        }} hitSlop={10}>
          <Text style={styles.proBadgeText}>🔒 Pro</Text>
        </Pressable>
      </View>
    );
  }

  const decrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(min, +(value - step).toFixed(2)));
  };
  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(max, +(value + step).toFixed(2)));
  };

  return (
    <View style={styles.stepper}>
      <Pressable
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={decrement}
        disabled={value <= min}
        hitSlop={8}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{format(value)}</Text>
      <Pressable
        style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
        onPress={increment}
        disabled={value >= max}
        hitSlop={8}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

// ── LinkRow ───────────────────────────────────────────────────────────────────

function LinkRow({
  title,
  sub,
  onPress,
  destructive,
}: {
  title: string;
  sub?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}>
      <View style={styles.rowLabel}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.linkArrow}>›</Text>
    </Pressable>
  );
}

// ── TimePicker ────────────────────────────────────────────────────────────────

function TimePicker({
  selectedHour,
  selectedMinute,
  onSelect,
}: {
  selectedHour: number;
  selectedMinute: number;
  onSelect: (h: number, m: number) => void;
}) {
  return (
    <View style={styles.timePickerWrap}>
      <Text style={styles.timePickerLabel}>Remind me at</Text>
      <View style={styles.timeChipsRow}>
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
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const {
    // Timer
    focusMins, shortBreakMins, longBreakMins, sessionsBeforeLongBreak,
    autoStartBreaks, autoStartFocus, keepAwakeEnabled, hapticPulseEnabled,
    setFocusMins, setShortBreakMins, setLongBreakMins, setSessionsBeforeLongBreak,
    setAutoStartBreaks, setAutoStartFocus, setKeepAwakeEnabled, setHapticPulseEnabled,
    // Sound
    defaultVolume, fadeInDuration,
    setDefaultVolume, setFadeInDuration,
    // Notifications
    notificationsEnabled, sessionCompleteAlert, breakReminderEnabled,
    dailyReminderEnabled, reminderHour, reminderMinute,
    setNotificationsEnabled, setSessionCompleteAlert, setBreakReminderEnabled,
    setDailyReminderEnabled, setReminderHour, setReminderMinute,
  } = useTimerSettings();

  const { isPremium, restorePurchases } = usePremium();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const openPaywall = useCallback(() => setPaywallVisible(true), []);

  // ── Notification helpers ─────────────────────────────────────────────────

  const ensurePermissions = async (): Promise<boolean> => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Notifications disabled',
        'Please enable notifications for FocusBlock in your device Settings.',
        [{ text: 'OK' }],
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
    if (!enabled && dailyReminderEnabled) {
      setDailyReminderEnabled(false);
      await cancelReminder();
    }
  };

  const handleToggleDailyReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensurePermissions();
      if (!granted) return;
      setDailyReminderEnabled(true);
      await scheduleReminder(reminderHour, reminderMinute);
    } else {
      setDailyReminderEnabled(false);
      await cancelReminder();
    }
  };

  const handleReminderTimeChange = async (hour: number, minute: number) => {
    setReminderHour(hour);
    setReminderMinute(minute);
    if (dailyReminderEnabled) await scheduleReminder(hour, minute);
  };

  // ── General helpers ──────────────────────────────────────────────────────

  const handleRateApp = async () => {
    const supported = await Linking.canOpenURL(APP_STORE_URL);
    if (supported) {
      await Linking.openURL(APP_STORE_URL);
    } else {
      Alert.alert('Cannot open App Store', 'Please search for FocusBlock in the App Store.');
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: "I've been using FocusBlock to stay deeply focused. Check it out!",
        url: APP_STORE_URL,
      });
    } catch {}
  };

  const handleRestorePurchases = async () => {
    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('Nothing to restore', 'No active subscription was found for this account.');
      }
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    }
  };

  const handleOpenURL = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const handleDevResetPremium = async () => {
    const { MockPurchaseAdapter } = await import('../../src/services/purchases/adapters/MockPurchaseAdapter');
    await MockPurchaseAdapter.resetPremium();
    Alert.alert('Premium Reset', 'Restart the app to apply the change.');
  };

  // ── Reminder time label for hint ─────────────────────────────────────────

  const reminderTimeLabel =
    REMINDER_TIMES.find((t) => t.hour === reminderHour && t.minute === reminderMinute)?.label ??
    `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Settings</Text>
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: Timer Settings                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Timer Settings" />

          {/* Duration controls */}
          <Card>
            {/* Focus */}
            <SettingRow
              title="Focus duration"
              sub={isPremium ? undefined : 'Pro feature'}
              right={
                <Stepper
                  value={focusMins}
                  min={5}
                  max={120}
                  step={5}
                  format={(v) => `${v} min`}
                  onChange={setFocusMins}
                  locked={!isPremium}
                  onUnlock={openPaywall}
                />
              }
            />
            <Divider />

            {/* Short break */}
            <SettingRow
              title="Short break"
              sub={isPremium ? undefined : 'Pro feature'}
              right={
                <Stepper
                  value={shortBreakMins}
                  min={1}
                  max={30}
                  step={1}
                  format={(v) => `${v} min`}
                  onChange={setShortBreakMins}
                  locked={!isPremium}
                  onUnlock={openPaywall}
                />
              }
            />
            <Divider />

            {/* Long break */}
            <SettingRow
              title="Long break"
              sub={isPremium ? undefined : 'Pro feature'}
              right={
                <Stepper
                  value={longBreakMins}
                  min={5}
                  max={60}
                  step={5}
                  format={(v) => `${v} min`}
                  onChange={setLongBreakMins}
                  locked={!isPremium}
                  onUnlock={openPaywall}
                />
              }
            />
            <Divider />

            {/* Sessions before long break — available to all users */}
            <SettingRow
              title="Sessions before long break"
              sub="Focus sessions per cycle"
              right={
                <Stepper
                  value={sessionsBeforeLongBreak}
                  min={2}
                  max={8}
                  step={1}
                  format={(v) => String(v)}
                  onChange={setSessionsBeforeLongBreak}
                />
              }
            />
          </Card>

          {/* Behaviour toggles */}
          <Card>
            <ToggleRow
              title="Auto-start breaks"
              sub="Start break automatically after focus"
              value={autoStartBreaks}
              onChange={setAutoStartBreaks}
            />
            <Divider />
            <ToggleRow
              title="Auto-start focus"
              sub="Start focus automatically after breaks"
              value={autoStartFocus}
              onChange={setAutoStartFocus}
            />
            <Divider />
            <ToggleRow
              title="Keep screen awake"
              sub="Prevent screen from sleeping during sessions"
              value={keepAwakeEnabled}
              onChange={setKeepAwakeEnabled}
            />
            <Divider />
            <ToggleRow
              title="Focus pulse"
              sub="Subtle haptic nudge every 5 min while focusing"
              value={hapticPulseEnabled}
              onChange={setHapticPulseEnabled}
            />
          </Card>
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: Sound Settings                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Sound Settings" />
          <Card>
            <SettingRow
              title="Default volume"
              sub="Applied when sounds are toggled on"
              right={
                <Stepper
                  value={defaultVolume}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={setDefaultVolume}
                />
              }
            />
            <Divider />
            <SettingRow
              title="Fade-in duration"
              sub="Seconds to fade in when sounds start"
              right={
                <Stepper
                  value={fadeInDuration}
                  min={0}
                  max={10}
                  step={1}
                  format={(v) => (v === 0 ? 'Off' : `${v}s`)}
                  onChange={setFadeInDuration}
                />
              }
            />
          </Card>
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: Notification Settings                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Notifications" />
          <Card>
            {/* Master toggle */}
            <ToggleRow
              title="Session complete"
              sub="Alert when a focus session ends"
              value={notificationsEnabled && sessionCompleteAlert}
              onChange={async (v) => {
                if (v && !notificationsEnabled) {
                  // Turning on when master was off — request permission first
                  await handleToggleNotifications(true);
                }
                setSessionCompleteAlert(v);
              }}
            />
            <Divider />

            {/* Sub-section dimmed when notifications off */}
            <View style={[!notificationsEnabled && styles.disabledSection]}>
              <ToggleRow
                title="Break reminder"
                sub="Alert when a break session ends"
                value={breakReminderEnabled && notificationsEnabled}
                onChange={notificationsEnabled ? setBreakReminderEnabled : () => {}}
              />
              <Divider />
              <ToggleRow
                title="Daily reminder"
                sub="Nudge if you haven't focused yet today"
                value={dailyReminderEnabled && notificationsEnabled}
                onChange={notificationsEnabled ? handleToggleDailyReminder : () => {}}
              />
              {dailyReminderEnabled && notificationsEnabled && (
                <TimePicker
                  selectedHour={reminderHour}
                  selectedMinute={reminderMinute}
                  onSelect={handleReminderTimeChange}
                />
              )}
            </View>
          </Card>

          {dailyReminderEnabled && notificationsEnabled && (
            <Text style={styles.reminderHint}>
              Daily nudge scheduled for {reminderTimeLabel}.
            </Text>
          )}

          {!notificationsEnabled && (
            <Pressable style={styles.enableNotifsRow} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleToggleNotifications(true);
            }}>
              <Text style={styles.enableNotifsText}>Enable notifications →</Text>
            </Pressable>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 4: General                                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="General" />
          <Card>
            <LinkRow title="Rate FocusBlock" sub="Enjoying the app? Leave a review" onPress={handleRateApp} />
            <Divider />
            <LinkRow title="Share with a friend" sub="Spread the focus" onPress={handleShareApp} />
          </Card>

          {!isPremium && (
            <Card>
              <LinkRow
                title="Restore Purchases"
                sub="Already subscribed? Tap to restore Pro"
                onPress={handleRestorePurchases}
              />
            </Card>
          )}

          <Card>
            <LinkRow title="Privacy Policy" onPress={() => handleOpenURL(PRIVACY_URL)} />
            <Divider />
            <LinkRow title="Terms of Service" onPress={() => handleOpenURL(TERMS_URL)} />
          </Card>

          {/* Version */}
          <View style={styles.versionWrap}>
            <Text style={styles.versionText}>FocusBlock v{APP_VERSION}</Text>
            {isPremium && (
              <View style={styles.proBadgeSmall}>
                <Text style={styles.proBadgeSmallText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.versionSub}>Built for deep work</Text>
        </View>

        {/* ── Dev-only tools ──────────────────────────────────────────────── */}
        {__DEV__ && (
          <Pressable style={styles.devResetBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleDevResetPremium();
          }}>
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
  container: { paddingHorizontal: 20, paddingBottom: 52 },

  header: { paddingTop: 16, paddingBottom: 20 },
  screenTitle: { fontSize: 22, fontWeight: '600', color: COLORS.textSecondary },

  // ── Sections
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // ── Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: COLORS.surfaceBorder, marginHorizontal: -4 },

  // ── Generic row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: { flex: 1 },
  rowTitle: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '400' },
  rowTitleDestructive: { color: 'rgba(220,80,80,0.85)' },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowRight: { flexShrink: 0 },
  linkArrow: { fontSize: 20, color: COLORS.textDim, lineHeight: 24 },

  // ── Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceHighlight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.28 },
  stepBtnText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '300',
    lineHeight: 22,
    marginTop: -1,
  },
  stepperValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // Locked stepper state
  stepperLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperLockedValue: {
    fontSize: 13,
    color: COLORS.textDim,
    fontWeight: '400',
    minWidth: 44,
    textAlign: 'right',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232,168,124,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proBadgeText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Notifications
  disabledSection: { opacity: 0.38, pointerEvents: 'none' },
  enableNotifsRow: { paddingHorizontal: 4, paddingTop: 4 },
  enableNotifsText: { fontSize: 12, color: COLORS.accent },
  reminderHint: {
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 17,
    marginTop: -4,
    paddingHorizontal: 4,
  },

  // ── Time picker
  timePickerWrap: { paddingBottom: 14, paddingTop: 2 },
  timePickerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  timeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  timeChipText: { fontSize: 12, color: COLORS.textMuted },
  timeChipTextActive: { color: COLORS.accent, fontWeight: '600' },

  // ── Version / about
  versionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
  },
  versionText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  proBadgeSmall: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.bgDark,
    letterSpacing: 1,
  },
  versionSub: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Dev toggle
  devResetBtn: {
    marginTop: 8,
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
