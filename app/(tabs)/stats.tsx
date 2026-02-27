import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { TIMER_MODES } from '../../constants/data';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Placeholder heights — replace with real AsyncStorage data
const WEEK_HEIGHTS = [65, 80, 45, 90, 70, 30, 55];

const ACHIEVEMENTS = [
  { icon: '🎯', title: 'First Focus',  desc: 'Complete your first session',      threshold: 1,  stat: 'sessions' },
  { icon: '🔥', title: 'On Fire',      desc: '3 day streak',                     threshold: 3,  stat: 'streak' },
  { icon: '⚡', title: 'Power Hour',   desc: 'Focus for 60+ minutes in a day',   threshold: 60, stat: 'minutes' },
  { icon: '🏆', title: 'Deep Worker',  desc: 'Complete 10 sessions',             threshold: 10, stat: 'sessions' },
] as const;

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function StatsScreen() {
  // TODO: load from AsyncStorage
  const sessions = 0;
  const minutes = 0;
  const streak = 3;

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const isDone = (stat: string, threshold: number) => {
    if (stat === 'sessions') return sessions >= threshold;
    if (stat === 'minutes') return minutes >= threshold;
    if (stat === 'streak') return streak >= threshold;
    return false;
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
          <Text style={styles.screenTitle}>Your Focus Stats</Text>
          <Text style={styles.screenSub}>Track your deep work progress</Text>
        </View>

        {/* Stat cards */}
        <View style={styles.statRow}>
          <StatCard label="Sessions" value={sessions} sub="today" />
          <StatCard label="Minutes"  value={minutes}  sub="focused" />
          <StatCard label="Streak"   value={`${streak}🔥`} sub="days" />
        </View>

        {/* Weekly chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.chart}>
            {WEEK_DAYS.map((day, i) => (
              <View key={day} style={styles.barGroup}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${WEEK_HEIGHTS[i]}%`,
                      backgroundColor:
                        i === todayIdx
                          ? TIMER_MODES[0].color + '90'
                          : COLORS.surfaceHighlight,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.barLabel,
                    i === todayIdx && { color: COLORS.accent },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <View style={styles.achievementList}>
            {ACHIEVEMENTS.map((ach) => {
              const done = isDone(ach.stat, ach.threshold);
              return (
                <View
                  key={ach.title}
                  style={[styles.achievement, !done && styles.achievementLocked]}
                >
                  <Text style={styles.achievementIcon}>{ach.icon}</Text>
                  <View style={styles.achievementText}>
                    <Text style={styles.achievementTitle}>{ach.title}</Text>
                    <Text style={styles.achievementDesc}>{ach.desc}</Text>
                  </View>
                  {done && <Text style={styles.achievementCheck}>✓</Text>}
                </View>
              );
            })}
          </View>
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
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 13,
    color: COLORS.textTiny,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statSub: {
    fontSize: 10,
    color: 'rgba(232,168,124,0.6)',
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 6,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  achievementList: {
    gap: 12,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementLocked: {
    opacity: 0.35,
  },
  achievementIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  achievementDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  achievementCheck: {
    fontSize: 12,
    color: COLORS.shortBreak,
  },
});
