import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  progress: number; // 0 → 1
  size: number;
  strokeWidth: number;
  color: string;
  children?: React.ReactNode;
}

/**
 * Circular progress ring using Reanimated for smooth animation.
 *
 * Uses the half-circle rotation technique:
 * Phase 1 (progress 0→0.5): right cover sweeps away clockwise (reveals right arc).
 * Phase 2 (progress 0.5→1): left cover sweeps away clockwise (reveals left arc).
 */
export function CircularTimer({ progress, size, strokeWidth, color, children }: Props) {
  const half = size / 2;

  const rightCover = useSharedValue(0);
  const leftCover = useSharedValue(0);

  useEffect(() => {
    const c = Math.max(0, Math.min(1, progress));
    const targetRight = Math.min(c * 2, 1) * 180;
    const targetLeft = Math.max(0, (c - 0.5) * 2) * 180;

    const config = { duration: 900, easing: Easing.out(Easing.cubic) };
    rightCover.value = withTiming(targetRight, config);
    leftCover.value = withTiming(targetLeft, config);
  }, [progress]);

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightCover.value}deg` }],
  }));

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-leftCover.value}deg` }],
  }));

  const ring: ViewStyle = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: strokeWidth,
  };

  return (
    <View style={{ width: size, height: size }}>
      {/* Track ring */}
      <View style={[ring, { borderColor: 'rgba(255,255,255,0.08)' }]} />

      {/* Colored ring (full circle — covers mask the unfilled portion) */}
      <View style={[ring, { borderColor: color }]} />

      {/* Right half-cover: sweeps away to reveal right arc (12→6 o'clock) */}
      <View style={[styles.clip, { left: half, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.cover,
            { left: -half, width: size, height: size, backgroundColor: '#0d0b11' },
            rightStyle,
          ]}
        />
      </View>

      {/* Left half-cover: sweeps away to reveal left arc (6→12 o'clock) */}
      <View style={[styles.clip, { left: 0, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.cover,
            { left: 0, width: size, height: size, backgroundColor: '#0d0b11' },
            leftStyle,
          ]}
        />
      </View>

      {/* Center content */}
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  cover: {
    position: 'absolute',
    top: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
