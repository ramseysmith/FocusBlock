import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

export const DRIFT_APP_STORE_URL =
  'https://apps.apple.com/us/app/drift-white-noise-sleep/id6758258891';

// ── Component ─────────────────────────────────────────────────────────────────

export function DriftPromoCard({
  onPress,
  onDismiss,
}: {
  /** Called when the user taps the main card body (after analytics recorded). */
  onPress: () => void;
  /** Called when the user taps the × button. */
  onDismiss: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      {/* Gradient card — full press area */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel="Try Drift sleep sounds app"
      >
        {/* Gradient background */}
        <LinearGradient
          colors={['#1c1535', '#151130', '#0e0b24']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Subtle top border glow */}
        <View style={styles.topGlow} />

        {/* Card content */}
        <View style={styles.content}>
          <Text style={styles.moon}>🌙</Text>

          <View style={styles.textBlock}>
            <Text style={styles.headline}>Love ambient sounds?</Text>
            <Text style={styles.sub}>Try Drift for better sleep</Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>
      </Pressable>

      {/* Dismiss button — rendered outside the card Pressable so taps don't
          bubble up to the card's onPress handler */}
      <Pressable
        onPress={onDismiss}
        style={styles.dismissBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss Drift promotion"
      >
        <Text style={styles.dismissText}>×</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer wrapper holds both the card and the dismiss button in a relative
  // container so the × can be positioned in the corner without affecting layout.
  wrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'visible',
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(160,130,255,0.15)',
  },
  cardPressed: {
    opacity: 0.82,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(180,150,255,0.2)',
    borderRadius: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  moon: {
    fontSize: 26,
    lineHeight: 32,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  headline: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  sub: {
    fontSize: 12,
    color: 'rgba(180,150,255,0.7)',
    lineHeight: 17,
  },
  arrow: {
    fontSize: 22,
    color: 'rgba(180,150,255,0.5)',
    fontWeight: '300',
    lineHeight: 26,
  },

  // Dismiss × — sits in the top-right corner of the wrapper
  dismissBtn: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.bgMid,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dismissText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 14,
    marginTop: -1,
  },
});
