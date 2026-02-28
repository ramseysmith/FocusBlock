import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

// ── Card dimensions — 1:1.78 ratio (9:16) rendered at logical 360×640 ─────────
// captureRef() will upscale to 1080×1920 via the width/height capture options.

export const CARD_W = 360;
export const CARD_H = 640;

const QUOTES = [
  'Every minute of focus builds a sharper mind.',
  'Deep work is your superpower.',
  'Progress is made one session at a time.',
  'Your focus defines your future.',
  'Small sessions compound into great results.',
  'Consistency beats intensity every time.',
  'One focused hour outweighs ten distracted ones.',
];

function formatMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ShareCardProps {
  /** Focus sessions completed today */
  sessions: number;
  /** Focus minutes logged today */
  todayMinutes: number;
  /** Current daily streak */
  streak: number;
  /** Pre-formatted date string shown on the card (e.g. "SATURDAY · FEB 28") */
  dateLabel: string;
}

export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ sessions, todayMinutes, streak, dateLabel }, ref) => {
    const quote = QUOTES[sessions % QUOTES.length];

    return (
      <View ref={ref} style={styles.root} collapsable={false}>
        {/* Dark gradient background */}
        <LinearGradient
          colors={['#0d0b11', '#12101a', '#1c1427']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />

        {/* Decorative glow circle (top-right) */}
        <View style={styles.glowCircle} />
        {/* Decorative glow circle (bottom-left) */}
        <View style={styles.glowCircleAlt} />

        {/* ── Logo row ── */}
        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>⏱</Text>
          <Text style={styles.logoText}>FocusBlock</Text>
        </View>

        {/* ── Date ── */}
        <Text style={styles.dateText}>{dateLabel}</Text>

        {/* ── Amber separator ── */}
        <View style={styles.separator} />

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {/* Sessions */}
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{sessions}</Text>
            <Text style={styles.statLabel}>sessions</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Minutes focused */}
          <View style={styles.statCell}>
            <Text style={[styles.statNum, styles.statNumAccent]}>{formatMins(todayMinutes)}</Text>
            <Text style={styles.statLabel}>focused</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Streak */}
          <View style={styles.statCell}>
            <Text style={styles.statNum}>
              {streak > 0 ? `${streak}` : '0'}
              {streak > 0 ? ' 🔥' : ''}
            </Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
        </View>

        {/* ── Amber separator ── */}
        <View style={styles.separator} />

        {/* ── Motivational quote ── */}
        <View style={styles.quoteWrap}>
          <Text style={styles.quoteOpenMark}>"</Text>
          <Text style={styles.quoteText}>{quote}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerPill}>
            <Text style={styles.footerText}>focusblock.app</Text>
          </View>
        </View>
      </View>
    );
  },
);

ShareCard.displayName = 'ShareCard';

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    width: CARD_W,
    height: CARD_H,
    overflow: 'hidden',
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glowCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(232,168,124,0.07)',
    top: -80,
    right: -60,
  },
  glowCircleAlt: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(133,205,202,0.04)',
    bottom: -60,
    left: -40,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 30,
    lineHeight: 36,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 0,
  },

  separator: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.65,
    marginVertical: 30,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: CARD_W,
    paddingHorizontal: 20,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 34,
  },
  statNumAccent: {
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  quoteWrap: {
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  quoteOpenMark: {
    fontSize: 52,
    color: COLORS.accent,
    opacity: 0.3,
    lineHeight: 44,
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginBottom: -8,
  },
  quoteText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    bottom: 38,
    alignItems: 'center',
  },
  footerPill: {
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(232,168,124,0.55)',
    letterSpacing: 1.2,
  },
});
