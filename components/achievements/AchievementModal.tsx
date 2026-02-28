import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';
import type { AchievementDef } from '../../src/services/AchievementService';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Confetti particles ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#E8A87C', // amber
  '#85CDCA', // teal
  '#D4A5E5', // lavender
  '#FFFFFF',  // white
  '#F4D03F', // yellow
];

const N_PARTICLES = 22;

// Deterministic particle configs — varied angles, distances, sizes, shapes
const PARTICLE_CONFIGS = Array.from({ length: N_PARTICLES }, (_, i) => {
  const angle = (i / N_PARTICLES) * Math.PI * 2 + (i % 5) * 0.22;
  const dist = 58 + (i % 6) * 22;        // 58–168 px outward
  const size = 7 + (i % 4) * 3;          // 7, 10, 13, 16
  const isRect = i % 3 === 1;             // every 3rd is a rectangle
  return {
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist,
    size,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    isRect,
    delay: i * 22,
  };
});

// Particles burst from the approximate center of the achievement emoji
const ORIGIN_X = SW * 0.5;
const ORIGIN_Y = SH * 0.43;

type ParticleConfig = (typeof PARTICLE_CONFIGS)[number];

function Particle({ config, trigger }: { config: ParticleConfig; trigger: boolean }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      p.value = 0;
      p.value = withDelay(config.delay, withSpring(1, { damping: 8, stiffness: 50 }));
    } else {
      p.value = withTiming(0, { duration: 180 });
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(p.value, [0, 0.1, 0.68, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: config.tx * p.value },
        { translateY: config.ty * p.value },
        { scale: interpolate(p.value, [0, 0.22, 0.8, 1], [0.1, 1.35, 1.0, 0.65]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: ORIGIN_Y - config.size / 2,
          left: ORIGIN_X - config.size / 2,
          width: config.size,
          height: config.isRect ? Math.round(config.size * 0.5) : config.size,
          borderRadius: config.isRect ? 2 : config.size / 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AchievementModal({
  achievement,
  onDismiss,
}: {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}) {
  const visible = achievement !== null;
  const [animTrigger, setAnimTrigger] = useState(false);

  const cardScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  // Animate in and schedule auto-dismiss whenever a new achievement is shown
  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 14, stiffness: 155 });
      cardOpacity.value = withTiming(1, { duration: 260 });
      const particleId = setTimeout(() => setAnimTrigger(true), 90);
      const dismissId = setTimeout(onDismiss, 4600);
      return () => {
        clearTimeout(particleId);
        clearTimeout(dismissId);
      };
    } else {
      setAnimTrigger(false);
      cardScale.value = 0.82;
      cardOpacity.value = 0;
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hooks must all be called before the early return
  if (!achievement) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        {/* Confetti layer — pointerEvents="none" so taps pass through to overlay */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {PARTICLE_CONFIGS.map((config, i) => (
            <Particle key={i} config={config} trigger={animTrigger} />
          ))}
        </View>

        {/* Achievement card */}
        <Animated.View style={[styles.card, cardStyle]}>
          {/* "NEW ACHIEVEMENT" badge */}
          <View style={styles.pill}>
            <Text style={styles.pillText}>✦  NEW ACHIEVEMENT</Text>
          </View>

          {/* Achievement icon */}
          <Text style={styles.icon}>{achievement.icon}</Text>

          {/* Title */}
          <Text style={styles.title}>{achievement.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Subtle dismiss hint */}
          <Text style={styles.hint}>Tap anywhere to continue</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SW * 0.84,
    backgroundColor: COLORS.bgMid,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.28)',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 24,
  },
  pill: {
    backgroundColor: 'rgba(232,168,124,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.32)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 26,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 68,
    marginBottom: 18,
    lineHeight: 78,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: 0.3,
  },
});
