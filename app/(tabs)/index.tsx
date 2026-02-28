import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { CircularTimer } from '../../components/CircularTimer';
import { COLORS } from '../../constants/theme';
import { AMBIENT_SOUNDS, QUOTES } from '../../constants/data';
import { useTimerSettings } from '../../context/TimerSettings';
import { useAudioMixer, type SoundId } from '../../context/AudioMixer';
import { useStatsStore } from '../../context/StatsStore';
import {
  scheduleTimerNotification,
  cancelNotification,
  dismissDeliveredNotifications,
} from '../../lib/notifications';
import { InterstitialTrigger } from '../../components/ads/InterstitialTrigger';
import { useAds } from '../../hooks/useAds';

// One quote per session load
const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Mode definitions (durations are overridden by settings)
const MODE_META = [
  { id: 'focus', label: 'Focus', color: '#E8A87C' },
  { id: 'short', label: 'Short Break', color: '#85CDCA' },
  { id: 'long', label: 'Long Break', color: '#D4A5E5' },
] as const;

type ModeIndex = 0 | 1 | 2;

/** After a focus session, pick short break (idx=1) or long break (idx=2). */
function nextModeIndex(currentIdx: ModeIndex, completedFocusSessions: number): ModeIndex {
  if (currentIdx !== 0) return 0; // Any break → back to focus
  // Every 4th focus session earns a long break
  return completedFocusSessions % 4 === 0 ? 2 : 1;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerScreen() {
  const {
    focusMins, shortBreakMins, longBreakMins,
    autoStart, keepAwakeEnabled, notificationsEnabled,
  } = useTimerSettings();
  const { soundStates } = useAudioMixer();
  const { recordSession } = useStatsStore();
  const { onFocusSessionComplete } = useAds();
  // Stable refs so narrow-dep effects always call the latest versions
  const recordSessionRef = useRef(recordSession);
  recordSessionRef.current = recordSession;
  const onFocusSessionCompleteRef = useRef(onFocusSessionComplete);
  onFocusSessionCompleteRef.current = onFocusSessionComplete;
  const notifIdRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const [adTrigger, setAdTrigger] = useState(0);

  // Derive effective mode durations from settings
  const modes = useMemo(
    () => [
      { ...MODE_META[0], duration: focusMins * 60 },
      { ...MODE_META[1], duration: shortBreakMins * 60 },
      { ...MODE_META[2], duration: longBreakMins * 60 },
    ],
    [focusMins, shortBreakMins, longBreakMins]
  );

  const [modeIdx, setModeIdx] = useState<ModeIndex>(0);
  const [timeLeft, setTimeLeft] = useState(modes[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [focusSessions, setFocusSessions] = useState(0);

  const mode = modes[modeIdx];
  const progress = 1 - timeLeft / mode.duration;

  // ── Keep screen awake during active focus sessions ─────────────────────────
  useEffect(() => {
    if (isRunning && keepAwakeEnabled) {
      activateKeepAwake('pomodoro');
    } else {
      deactivateKeepAwake('pomodoro');
    }
    return () => deactivateKeepAwake('pomodoro');
  }, [isRunning, keepAwakeEnabled]);

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [isRunning, timeLeft]);

  // Keep isRunningRef in sync for use in AppState handler (avoids stale closure)
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // ── AppState: correct timer drift after backgrounding ─────────────────────
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (isRunningRef.current) {
          backgroundedAtRef.current = Date.now();
        }
      } else if (next === 'active' && backgroundedAtRef.current !== null) {
        const elapsedMs = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (isRunningRef.current) {
          const elapsedSec = Math.floor(elapsedMs / 1000);
          setTimeLeft((t) => Math.max(0, t - elapsedSec));
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // ── Session completion handler ──────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return;

    setIsRunning(false);
    // Notification already fired from OS; dismiss it from tray since we're in-app
    dismissDeliveredNotifications();
    notifIdRef.current = null;

    const isFocus = modeIdx === 0;
    const newFocusSessions = isFocus ? focusSessions + 1 : focusSessions;
    if (isFocus) {
      setFocusSessions(newFocusSessions);
      recordSessionRef.current(Math.round(modes[modeIdx].duration / 60));
      onFocusSessionCompleteRef.current().then((shouldShow) => {
        if (shouldShow) setAdTrigger((t) => t + 1);
      }).catch(() => {});
    }

    const next = nextModeIndex(modeIdx, newFocusSessions);
    const delay = autoStart ? 1500 : 0;

    const timer = setTimeout(() => {
      setModeIdx(next);
      setTimeLeft(modes[next].duration);
      if (autoStart) setIsRunning(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [timeLeft, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ intentionally narrow deps: snapshot modeIdx/focusSessions/modes/autoStart at completion

  // ── Controls ────────────────────────────────────────────────────────────────

  /** Cancel any outstanding timer notification and clear the ref. */
  const clearTimerNotif = useCallback(() => {
    if (notifIdRef.current) {
      cancelNotification(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, []);

  const selectMode = (idx: ModeIndex) => {
    clearTimerNotif();
    setModeIdx(idx);
    setTimeLeft(modes[idx].duration);
    setIsRunning(false);
  };

  const resetTimer = () => {
    clearTimerNotif();
    setTimeLeft(mode.duration);
    setIsRunning(false);
  };

  const skipToNext = () => {
    const next = nextModeIndex(modeIdx, focusSessions);
    selectMode(next);
  };

  /**
   * Play/pause toggle.
   * On play: schedule a timer notification for the remaining seconds.
   * On pause: cancel it.
   */
  const handlePlayPause = useCallback(() => {
    if (isRunning) {
      clearTimerNotif();
      setIsRunning(false);
    } else {
      setIsRunning(true);
      if (notificationsEnabled && timeLeft > 0) {
        scheduleTimerNotification({
          isFocus: modeIdx === 0,
          durationSeconds: timeLeft,
          focusSessionsCompleted: focusSessions,
        }).then((id) => {
          notifIdRef.current = id;
        });
      }
    }
  }, [isRunning, notificationsEnabled, modeIdx, timeLeft, focusSessions, clearTimerNotif]);

  const activeSoundIds = AMBIENT_SOUNDS
    .filter((s) => soundStates[s.id as SoundId]?.isPlaying)
    .map((s) => s.id);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <InterstitialTrigger
        trigger={adTrigger}
        placement="interstitial_session"
        onError={(e) => console.warn('[TimerScreen] interstitial error:', e)}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>FocusBlock</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          {focusSessions > 0 && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>
                {focusSessions} {focusSessions === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          )}
        </View>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {modes.map((m, i) => (
            <Pressable
              key={m.id}
              onPress={() => selectMode(i as ModeIndex)}
              style={[styles.modeBtn, modeIdx === i && styles.modeBtnActive]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  { color: modeIdx === i ? m.color : COLORS.textMuted },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Timer ring */}
        <View style={styles.timerWrap}>
          <CircularTimer progress={progress} size={260} strokeWidth={6} color={mode.color}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>
              {isRunning
                ? modeIdx === 0
                  ? 'focusing...'
                  : 'resting...'
                : mode.label.toLowerCase()}
            </Text>
            {/* Session dots — one per focus session, resets after 4 */}
            <View style={styles.sessionDots}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < focusSessions % 4 || (focusSessions > 0 && focusSessions % 4 === 0) ? mode.color : 'rgba(255,255,255,0.15)' },
                  ]}
                />
              ))}
            </View>
          </CircularTimer>
        </View>

        {/* Auto-start indicator */}
        {autoStart && (
          <Text style={styles.autoStartHint}>auto-start on</Text>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={resetTimer} style={styles.controlBtn}>
            <Text style={styles.controlBtnIcon}>↺</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={[styles.playBtn, { backgroundColor: mode.color, shadowColor: mode.color }]}
          >
            <Text style={styles.playBtnIcon}>{isRunning ? '⏸' : '▶'}</Text>
          </Pressable>

          <Pressable onPress={skipToNext} style={styles.controlBtn}>
            <Text style={styles.controlBtnIcon}>⏭</Text>
          </Pressable>
        </View>

        {/* Active sounds indicator */}
        {activeSoundIds.length > 0 && (
          <View style={styles.soundsIndicator}>
            <Text style={styles.soundsIndicatorLabel}>Playing:</Text>
            {activeSoundIds.map((id) => {
              const s = AMBIENT_SOUNDS.find((x) => x.id === id);
              return s ? (
                <Text key={id} style={styles.soundsEmoji}>
                  {s.emoji}
                </Text>
              ) : null;
            })}
          </View>
        )}

        {/* Quote */}
        <View style={styles.quoteWrap}>
          <Text style={styles.quoteText}>"{QUOTE}"</Text>
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
    paddingBottom: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  sessionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(232,168,124,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.2)',
  },
  sessionBadgeText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 32,
  },
  modeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 11,
  },
  modeBtnActive: {
    backgroundColor: COLORS.surfaceHighlight,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timerWrap: {
    marginBottom: 12,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    ...Platform.select({
      ios: { fontFamily: 'Courier New' },
      android: { fontFamily: 'monospace' },
    }),
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  autoStartHint: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    marginTop: 20,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnIcon: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  playBtnIcon: {
    fontSize: 22,
    color: COLORS.bgDark,
    fontWeight: '700',
  },
  soundsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  soundsIndicatorLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  soundsEmoji: {
    fontSize: 18,
  },
  quoteWrap: {
    paddingHorizontal: 8,
    paddingTop: 16,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 13,
    color: COLORS.textDim,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
});
