import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  progress: number;   // 0 → 1
  size: number;
  strokeWidth: number;
  color: string;
  children?: React.ReactNode;
}

/**
 * Circular progress ring built with pure React Native Views using the
 * half-circle rotation technique (no SVG dependency required).
 *
 * Phase 1 (progress 0→0.5): the right-half cover rotates away clockwise,
 *   revealing the right arc from 12 o'clock to 6 o'clock.
 * Phase 2 (progress 0.5→1): the left-half cover rotates away clockwise,
 *   revealing the left arc from 6 o'clock to 12 o'clock.
 */
export function CircularTimer({ progress, size, strokeWidth, color, children }: Props) {
  const half = size / 2;
  const clamp = Math.max(0, Math.min(1, progress));

  // Phase 1: right cover rotates from 0° → 180° as progress goes 0 → 0.5
  const rightCoverDeg = Math.min(clamp * 2, 1) * 180;
  // Phase 2: left cover rotates from 0° → 180° as progress goes 0.5 → 1
  const leftCoverDeg = Math.max(0, (clamp - 0.5) * 2) * 180;

  const ringStyle = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: strokeWidth,
  };

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View style={[ringStyle, { borderColor: 'rgba(255,255,255,0.08)' }]} />

      {/* Colored ring (always full) — covers will hide the unneeded parts */}
      <View style={[ringStyle, { borderColor: color }]} />

      {/* Right cover: bg-colored half that sweeps away to reveal right arc */}
      <View style={[styles.clipHalf, { left: half, width: half, height: size }]}>
        <View
          style={[
            styles.coverInner,
            {
              left: -half,
              width: size,
              height: size,
              backgroundColor: '#0d0b11',
              transform: [{ rotate: `${rightCoverDeg}deg` }],
            },
          ]}
        />
      </View>

      {/* Left cover: bg-colored half that sweeps away to reveal left arc */}
      <View style={[styles.clipHalf, { left: 0, width: half, height: size }]}>
        <View
          style={[
            styles.coverInner,
            {
              left: 0,
              width: size,
              height: size,
              backgroundColor: '#0d0b11',
              transform: [{ rotate: `${-leftCoverDeg}deg` }],
            },
          ]}
        />
      </View>

      {/* Center content */}
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clipHalf: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  coverInner: {
    position: 'absolute',
    top: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
