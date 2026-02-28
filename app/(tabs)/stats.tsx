import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, G, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { useStatsStore } from '../../context/StatsStore';
import { getWeekData, formatMinutes, type WeekDay } from '../../lib/storage';
import { BannerAd } from '../../components/ads/BannerAd';
import { usePremium } from '../../context/PremiumContext';
import { PaywallModal } from '../../components/paywall/PaywallModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const CHART_H = 130;     // height of the bar area
const LABEL_H = 22;      // height below bars for day labels
const MIN_BAR_H = 4;     // minimum visible height for non-zero bars

const ACHIEVEMENTS = [
  { icon: '🎯', title: 'First Focus',  desc: 'Complete your first session',      check: (s: number, _m: number, _str: number) => s >= 1 },
  { icon: '🔥', title: 'On Fire',      desc: '3-day streak',                     check: (_s: number, _m: number, str: number) => str >= 3 },
  { icon: '⚡', title: 'Power Hour',   desc: 'Accumulate 60+ focus minutes',     check: (_s: number, m: number, _str: number) => m >= 60 },
  { icon: '🏆', title: 'Deep Worker',  desc: 'Complete 10 sessions',             check: (s: number, _m: number, _str: number) => s >= 10 },
  { icon: '🌙', title: 'Night Owl',    desc: 'Complete 25 sessions',             check: (s: number, _m: number, _str: number) => s >= 25 },
  { icon: '💎', title: 'Diamond Mind', desc: 'Maintain a 7-day streak',          check: (_s: number, _m: number, str: number) => str >= 7 },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────

function WeekChart({
  weekData,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  isPremium,
}: {
  weekData: WeekDay[];
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  isPremium: boolean;
}) {
  const [chartWidth, setChartWidth] = useState(0);

  const maxMins = Math.max(...weekData.map((d) => d.minutes), 1);
  const numBars = weekData.length;

  const getBarH = (mins: number) =>
    mins > 0 ? Math.max((mins / maxMins) * CHART_H, MIN_BAR_H) : 0;

  // Week range label: "Feb 24 – Mar 2"
  const rangeLabel = (() => {
    const first = weekData[0];
    const last = weekData[6];
    const fmt = (key: string) => {
      const d = new Date(key + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    return `${fmt(first.key)} – ${fmt(last.key)}`;
  })();

  const svgH = CHART_H + LABEL_H;
  const canGoNext = weekOffset < 0;
  const canGoPrev = isPremium;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {/* Prev arrow */}
        <Pressable
          onPress={onPrevWeek}
          hitSlop={10}
          style={[styles.navArrow, !canGoPrev && styles.navArrowDisabled]}
        >
          <Text style={[styles.navArrowText, !canGoPrev && styles.navArrowTextDisabled]}>←</Text>
        </Pressable>

        {/* Title */}
        <View style={styles.chartTitleWrap}>
          <Text style={styles.cardTitle}>{weekOffset === 0 ? 'This Week' : rangeLabel}</Text>
          {weekOffset === 0 && (
            <Text style={styles.cardSub}>{rangeLabel}</Text>
          )}
        </View>

        {/* Next arrow */}
        <Pressable
          onPress={onNextWeek}
          hitSlop={10}
          style={[styles.navArrow, !canGoNext && styles.navArrowDisabled]}
          disabled={!canGoNext}
        >
          <Text style={[styles.navArrowText, !canGoNext && styles.navArrowTextDisabled]}>→</Text>
        </Pressable>
      </View>

      <View
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        style={styles.chartArea}
      >
        {chartWidth > 0 && (
          <Svg width={chartWidth} height={svgH}>
            <Defs>
              <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLORS.accent} stopOpacity="1" />
                <Stop offset="1" stopColor={COLORS.accent} stopOpacity="0.55" />
              </LinearGradient>
              <LinearGradient id="pastGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="rgba(255,255,255,0.22)" stopOpacity="1" />
                <Stop offset="1" stopColor="rgba(255,255,255,0.08)" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {weekData.map((day, i) => {
              const BAR_GAP = 6;
              const BAR_W = (chartWidth - BAR_GAP * (numBars - 1)) / numBars;
              const x = i * (BAR_W + BAR_GAP);
              const barH = getBarH(day.minutes);
              const barY = CHART_H - barH;

              return (
                <G key={day.key}>
                  {/* Track (background) */}
                  <Rect
                    x={x}
                    y={0}
                    width={BAR_W}
                    height={CHART_H}
                    rx={6}
                    fill="rgba(255,255,255,0.04)"
                  />

                  {/* Filled bar */}
                  {barH > 0 && (
                    <Rect
                      x={x}
                      y={barY}
                      width={BAR_W}
                      height={barH}
                      rx={6}
                      fill={day.isToday ? 'url(#barGrad)' : 'url(#pastGrad)'}
                    />
                  )}

                  {/* Minutes label above bar */}
                  {day.minutes > 0 && (
                    <SvgText
                      x={x + BAR_W / 2}
                      y={barY - 5}
                      textAnchor="middle"
                      fill={day.isToday ? COLORS.accent : 'rgba(255,255,255,0.4)'}
                      fontSize={9}
                      fontWeight="500"
                    >
                      {day.minutes}
                    </SvgText>
                  )}

                  {/* Day label */}
                  <SvgText
                    x={x + BAR_W / 2}
                    y={CHART_H + LABEL_H - 3}
                    textAnchor="middle"
                    fill={day.isToday ? COLORS.accent : 'rgba(255,255,255,0.3)'}
                    fontSize={10}
                    fontWeight={day.isToday ? '600' : '400'}
                  >
                    {day.label}
                  </SvgText>
                </G>
              );
            })}

            {/* Baseline */}
            <Line
              x1={0}
              y1={CHART_H}
              x2={chartWidth}
              y2={CHART_H}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          </Svg>
        )}
      </View>

      {/* Legend */}
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
          <Text style={styles.legendText}>Past days</Text>
        </View>
        {!isPremium && (
          <Text style={styles.historyHint}>Pro unlocks history</Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { totalSessions, totalMinutes, streak, dailyData, isLoaded } = useStatsStore();
  const { isPremium, isLoaded: premiumLoaded } = usePremium();

  const [weekOffset, setWeekOffset] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // ── Stagger entrance animations ─────────────────────────────────────────────
  const op0 = useSharedValue(0); const ty0 = useSharedValue(28);
  const op1 = useSharedValue(0); const ty1 = useSharedValue(28);
  const op2 = useSharedValue(0); const ty2 = useSharedValue(28);
  const op3 = useSharedValue(0); const ty3 = useSharedValue(28);

  const cardStyle0 = useAnimatedStyle(() => ({ opacity: op0.value, transform: [{ translateY: ty0.value }] }));
  const cardStyle1 = useAnimatedStyle(() => ({ opacity: op1.value, transform: [{ translateY: ty1.value }] }));
  const cardStyle2 = useAnimatedStyle(() => ({ opacity: op2.value, transform: [{ translateY: ty2.value }] }));
  const cardStyle3 = useAnimatedStyle(() => ({ opacity: op3.value, transform: [{ translateY: ty3.value }] }));

  useEffect(() => {
    const spring = { damping: 22, stiffness: 130 };
    [[op0, ty0], [op1, ty1], [op2, ty2], [op3, ty3]].forEach(([op, ty], i) => {
      const delay = i * 80;
      op.value = withDelay(delay, withTiming(1, { duration: 420 }));
      ty.value = withDelay(delay, withSpring(0, spring));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const weekData = getWeekData(dailyData, weekOffset);
  const weekMinutes = weekData.reduce((sum, d) => sum + d.minutes, 0);
  const weekSessions = weekData.reduce((sum, d) => sum + d.sessions, 0);

  const todayData = weekData.find((d) => d.isToday);

  const handlePrevWeek = () => {
    if (!isPremium) {
      setPaywallVisible(true);
      return;
    }
    setWeekOffset((prev) => prev - 1);
  };

  const handleNextWeek = () => {
    if (weekOffset < 0) setWeekOffset((prev) => prev + 1);
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
          <Text style={styles.screenTitle}>Focus Stats</Text>
          <Text style={styles.screenSub}>All-time • {isLoaded ? `${totalSessions} sessions` : '—'}</Text>
        </View>

        {/* Top stat cards */}
        <Animated.View style={[styles.statRow, cardStyle0]}>
          <StatCard
            label="Sessions"
            value={isLoaded ? totalSessions : '—'}
          />
          <StatCard
            label="Focus time"
            value={isLoaded ? formatMinutes(totalMinutes) : '—'}
          />
          <StatCard
            label="Streak"
            value={isLoaded ? (streak > 0 ? `${streak} 🔥` : '0') : '—'}
            accent={streak > 0}
          />
        </Animated.View>

        {/* This-week summary row */}
        <Animated.View style={[styles.weekSummaryRow, cardStyle1]}>
          <View style={styles.weekSummaryItem}>
            <Text style={styles.weekSummaryValue}>{weekSessions}</Text>
            <Text style={styles.weekSummaryLabel}>sessions this week</Text>
          </View>
          <View style={styles.weekSumDivider} />
          <View style={styles.weekSummaryItem}>
            <Text style={styles.weekSummaryValue}>{formatMinutes(weekMinutes)}</Text>
            <Text style={styles.weekSummaryLabel}>focused this week</Text>
          </View>
          {todayData && (
            <>
              <View style={styles.weekSumDivider} />
              <View style={styles.weekSummaryItem}>
                <Text style={styles.weekSummaryValue}>{todayData.sessions}</Text>
                <Text style={styles.weekSummaryLabel}>sessions today</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Weekly bar chart with nav */}
        <Animated.View style={cardStyle2}>
        <WeekChart
          weekData={weekData}
          weekOffset={weekOffset}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          isPremium={isPremium}
        />
        </Animated.View>

        {/* Achievements */}
        <Animated.View style={[styles.card, cardStyle3]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Achievements</Text>
            <Text style={styles.cardSub}>
              {ACHIEVEMENTS.filter((a) => a.check(totalSessions, totalMinutes, streak)).length}
              /{ACHIEVEMENTS.length} unlocked
            </Text>
          </View>
          <View style={styles.achievementList}>
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = ach.check(totalSessions, totalMinutes, streak);
              return (
                <View
                  key={ach.title}
                  style={[styles.achievement, !unlocked && styles.achievementLocked]}
                >
                  <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}>
                    <Text style={styles.achievementEmoji}>{ach.icon}</Text>
                  </View>
                  <View style={styles.achievementText}>
                    <Text style={[styles.achievementTitle, unlocked && styles.achievementTitleUnlocked]}>
                      {ach.title}
                    </Text>
                    <Text style={styles.achievementDesc}>{ach.desc}</Text>
                  </View>
                  {unlocked && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {!isPremium && premiumLoaded && (
          <BannerAd placement="banner_stats" size="banner" style={styles.bannerAdContainer} />
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
  container: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { paddingTop: 16, paddingBottom: 20 },
  screenTitle: { fontSize: 22, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 3 },
  screenSub: { fontSize: 12, color: COLORS.textTiny },

  // ── Stat cards
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statCardAccent: {
    backgroundColor: 'rgba(232,168,124,0.08)',
    borderColor: 'rgba(232,168,124,0.2)',
  },
  statValue: { fontSize: 26, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 32 },
  statValueAccent: { color: COLORS.accent },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Week summary row
  weekSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 14,
    marginBottom: 12,
  },
  weekSummaryItem: { flex: 1, alignItems: 'center' },
  weekSummaryValue: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  weekSummaryLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  weekSumDivider: { width: 1, height: 28, backgroundColor: COLORS.surfaceBorder },

  // ── Chart card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chartTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, letterSpacing: 0.3 },
  cardSub: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },

  // ── Week nav arrows
  navArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.25,
  },
  navArrowText: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  navArrowTextDisabled: {
    color: COLORS.textDim,
  },
  historyHint: {
    fontSize: 10,
    color: COLORS.textDim,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },

  chartArea: { width: '100%' },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textDim },

  // ── Achievements
  achievementList: { gap: 14 },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  achievementLocked: { opacity: 0.3 },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIconUnlocked: {
    backgroundColor: 'rgba(232,168,124,0.1)',
    borderColor: 'rgba(232,168,124,0.25)',
  },
  achievementEmoji: { fontSize: 22 },
  achievementText: { flex: 1 },
  achievementTitle: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  achievementTitleUnlocked: { color: COLORS.textPrimary },
  achievementDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(133,205,202,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 11, color: COLORS.shortBreak, fontWeight: '600' },

  bannerAdContainer: { marginTop: 12, marginBottom: 8 },
});
