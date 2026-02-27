import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircularTimer } from '../../components/CircularTimer';
import { COLORS } from '../../constants/theme';
import { TIMER_MODES, AMBIENT_SOUNDS, QUOTES } from '../../constants/data';

const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];

export default function TimerScreen() {
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSounds, setActiveSounds] = useState<Record<string, boolean>>({});
  const [sessionsCompleted, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = TIMER_MODES[modeIdx];
  const progress = 1 - timeLeft / mode.duration;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (modeIdx === 0) setSessions((s) => s + 1);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, modeIdx]);

  const selectMode = (idx: number) => {
    setModeIdx(idx);
    setTimeLeft(TIMER_MODES[idx].duration);
    setIsRunning(false);
  };

  const resetTimer = () => {
    setTimeLeft(mode.duration);
    setIsRunning(false);
  };

  const skipToNext = () => selectMode((modeIdx + 1) % TIMER_MODES.length);

  const activeSoundIds = Object.keys(activeSounds);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          {sessionsCompleted > 0 && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{sessionsCompleted} sessions</Text>
            </View>
          )}
        </View>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {TIMER_MODES.map((m, i) => (
            <Pressable
              key={m.id}
              onPress={() => selectMode(i)}
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
          <CircularTimer
            progress={progress}
            size={260}
            strokeWidth={6}
            color={mode.color}
          >
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>
              {isRunning ? 'focusing...' : mode.label.toLowerCase()}
            </Text>
          </CircularTimer>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={resetTimer} style={styles.controlBtn}>
            <Text style={styles.controlBtnIcon}>↺</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsRunning((r) => !r)}
            style={[
              styles.playBtn,
              {
                backgroundColor: mode.color,
                shadowColor: mode.color,
              },
            ]}
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
                <Text key={id} style={styles.soundsEmoji}>{s.emoji}</Text>
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
    marginBottom: 32,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    ...Platform.select({ ios: { fontFamily: 'Courier New' }, android: { fontFamily: 'monospace' } }),
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
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
