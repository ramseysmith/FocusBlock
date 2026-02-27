import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { AMBIENT_SOUNDS, QUICK_MIXES } from '../../constants/data';

// Audio playback via expo-av will be wired here.
// import { Audio } from 'expo-av';

type SoundState = {
  active: boolean;
  volume: number; // 0–100
};

function SoundChip({
  sound,
  state,
  onToggle,
  onVolume,
}: {
  sound: (typeof AMBIENT_SOUNDS)[number];
  state: SoundState;
  onToggle: () => void;
  onVolume: (v: number) => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.chipContainer}>
      <View style={[styles.chipIcon, state.active && styles.chipIconActive]}>
        <Text style={styles.chipEmoji}>{sound.emoji}</Text>
      </View>
      <Text style={[styles.chipLabel, state.active && styles.chipLabelActive]}>
        {sound.label}
      </Text>
      {state.active && (
        <View style={styles.chipVolRow}>
          {[1, 2, 3, 4, 5].map((dot) => (
            <Pressable
              key={dot}
              onPress={() => onVolume(dot * 20)}
              style={[
                styles.volDot,
                state.volume >= dot * 20 && styles.volDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function SoundsScreen() {
  const [sounds, setSounds] = useState<Record<string, SoundState>>(() =>
    Object.fromEntries(AMBIENT_SOUNDS.map((s) => [s.id, { active: false, volume: 30 }]))
  );
  const [masterVolume, setMasterVolume] = useState(50);

  const activeSounds = AMBIENT_SOUNDS.filter((s) => sounds[s.id]?.active);

  const toggleSound = (id: string) => {
    setSounds((prev) => ({
      ...prev,
      [id]: { ...prev[id], active: !prev[id].active },
    }));
  };

  const setVolume = (id: string, v: number) => {
    setSounds((prev) => ({ ...prev, [id]: { ...prev[id], volume: v } }));
  };

  const applyMix = (soundIds: readonly string[]) => {
    setSounds((prev) => {
      const next = { ...prev };
      AMBIENT_SOUNDS.forEach((s) => {
        next[s.id] = { ...next[s.id], active: soundIds.includes(s.id) };
      });
      return next;
    });
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
          <Text style={styles.screenTitle}>Ambient Sounds</Text>
          <Text style={styles.screenSub}>
            Mix sounds to create your perfect focus environment
          </Text>
        </View>

        {/* Sound grid */}
        <View style={styles.grid}>
          {AMBIENT_SOUNDS.map((sound) => (
            <SoundChip
              key={sound.id}
              sound={sound}
              state={sounds[sound.id]}
              onToggle={() => toggleSound(sound.id)}
              onVolume={(v) => setVolume(sound.id, v)}
            />
          ))}
        </View>

        {/* Quick mixes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Mixes</Text>
          <View style={styles.mixRow}>
            {QUICK_MIXES.map((mix) => (
              <Pressable
                key={mix.label}
                onPress={() => applyMix(mix.sounds)}
                style={styles.mixBtn}
              >
                <Text style={styles.mixBtnText}>{mix.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Master volume */}
        <View style={styles.masterVolCard}>
          <View style={styles.masterVolHeader}>
            <Text style={styles.masterVolLabel}>Master Volume</Text>
            <Text style={styles.masterVolCount}>
              {activeSounds.length} active
            </Text>
          </View>
          <View style={styles.masterSliderRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
              <Pressable
                key={step}
                onPress={() => setMasterVolume(step * 10)}
                style={[
                  styles.masterDot,
                  masterVolume >= step * 10 && styles.masterDotActive,
                ]}
              />
            ))}
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
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  chipContainer: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconActive: {
    backgroundColor: 'rgba(232,168,124,0.15)',
    borderColor: 'rgba(232,168,124,0.4)',
  },
  chipEmoji: {
    fontSize: 28,
  },
  chipLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  chipLabelActive: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  chipVolRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  volDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceHighlight,
  },
  volDotActive: {
    backgroundColor: COLORS.accent,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  mixRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mixBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  mixBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  masterVolCard: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  masterVolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  masterVolLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  masterVolCount: {
    fontSize: 13,
    color: COLORS.accent,
  },
  masterSliderRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  masterDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceHighlight,
  },
  masterDotActive: {
    backgroundColor: COLORS.accent,
  },
});
