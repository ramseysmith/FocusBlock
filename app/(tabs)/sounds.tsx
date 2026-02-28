import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { AMBIENT_SOUNDS, QUICK_MIXES } from '../../constants/data';
import { useAudioMixer, type SoundId } from '../../context/AudioMixer';
import { VolumeSlider } from '../../components/VolumeSlider';
import { RewardedAdButton } from '../../components/ads/RewardedAdButton';
import { useAds } from '../../hooks/useAds';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { DriftPromoCard, DRIFT_APP_STORE_URL } from '../../components/DriftPromoCard';
import { isDriftCardDismissed, dismissDriftCard, incrementDriftTapCount } from '../../lib/crossPromo';
import * as Linking from 'expo-linking';

// ── Quick mix button ──────────────────────────────────────────────────────────

type Mix = (typeof QUICK_MIXES)[number];

function MixButton({
  mix,
  isActive,
  onPress,
  disabled,
}: {
  mix: Mix;
  isActive: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      style={[styles.mixBtn, isActive && styles.mixBtnActive, disabled && styles.mixBtnDisabled]}
    >
      <Text style={[styles.mixBtnText, isActive && styles.mixBtnTextActive]}>
        {mix.label}
      </Text>
    </Pressable>
  );
}

// ── Locked mixes card (free users) ────────────────────────────────────────────

function PremiumMixesLock({
  mixes,
  onUpgrade,
}: {
  mixes: readonly Mix[];
  onUpgrade: () => void;
}) {
  return (
    <View style={styles.mixLockCard}>
      {/* Dim preview of mix names */}
      <View style={styles.mixLockPreview}>
        {mixes.map((m) => (
          <View key={m.label} style={styles.mixLockChip}>
            <Text style={styles.mixLockChipText}>{m.label}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.mixLockCta} onPress={onUpgrade}>
        <Text style={styles.mixLockCtaText}>Unlock with FocusBlock Pro →</Text>
      </Pressable>
    </View>
  );
}

// ── Individual sound row ──────────────────────────────────────────────────────

function SoundRow({
  sound,
  isPlaying,
  volume,
  onToggle,
  onVolume,
  isLocked,
  onUnlock,
}: {
  sound: (typeof AMBIENT_SOUNDS)[number];
  isPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onVolume: (v: number) => void;
  isLocked: boolean;
  onUnlock: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    await onToggle();
    setLoading(false);
  };

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20)}
      style={[styles.soundRow, isPlaying && styles.soundRowActive, isLocked && styles.soundRowLocked]}
    >
      {/* Left: emoji + labels */}
      <View style={styles.soundLeft}>
        <View style={[styles.soundIcon, isPlaying && styles.soundIconActive]}>
          <Text style={styles.soundEmoji}>{sound.emoji}</Text>
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </View>
        <View>
          <Text style={[styles.soundName, isPlaying && styles.soundNameActive]}>
            {sound.label}
          </Text>
          {isLocked ? (
            <Text style={styles.lockedSub}>Watch ad for 24h · Go Premium to keep forever</Text>
          ) : isPlaying ? (
            <Text style={[styles.soundSub, { color: COLORS.accent + 'aa' }]}>
              {Math.round(volume * 100)}%
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right: toggle or unlock button */}
      {isLocked ? (
        <RewardedAdButton
          placement="rewarded_unlock"
          label="🔓 Unlock"
          loadingLabel="Loading…"
          style={styles.unlockBtn}
          textStyle={styles.unlockBtnText}
          onReward={() => onUnlock().then(() => handleToggle())}
          onError={(e) => console.warn('[SoundsScreen] rewarded ad error:', e)}
        />
      ) : (
        <Pressable
          onPress={handleToggle}
          style={[styles.toggleBtn, isPlaying && styles.toggleBtnActive]}
          hitSlop={12}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isPlaying ? COLORS.bgDark : COLORS.textMuted} />
          ) : (
            <View
              style={[
                styles.toggleDot,
                isPlaying && styles.toggleDotActive,
              ]}
            />
          )}
        </Pressable>
      )}

      {/* Volume slider — only when playing (and not locked) */}
      {!isLocked && isPlaying && (
        <Animated.View
          style={styles.sliderWrap}
          entering={FadeInDown.duration(220).springify()}
          exiting={FadeOutUp.duration(160)}
        >
          <VolumeSlider
            value={volume}
            onChange={onVolume}
            color={COLORS.accent}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SoundsScreen() {
  const { soundStates, toggleSound, setVolume, applyMix, stopAll } = useAudioMixer();
  const { isSoundLocked, grantSoundUnlock, isLoaded, isPremium } = useAds();
  const [paywallVisible, setPaywallVisible] = useState(false);

  // ── Drift cross-promo card ───────────────────────────────────────────────────
  // null = still checking AsyncStorage; false = hidden; true = visible
  const [driftCardVisible, setDriftCardVisible] = useState<boolean | null>(null);

  useEffect(() => {
    isDriftCardDismissed().then((dismissed) => {
      setDriftCardVisible(!dismissed);
    });
  }, []);

  const handleDriftTap = async () => {
    await incrementDriftTapCount();
    Linking.openURL(DRIFT_APP_STORE_URL);
  };

  const handleDriftDismiss = async () => {
    setDriftCardVisible(false);
    await dismissDriftCard();
  };

  const activeSounds = AMBIENT_SOUNDS.filter((s) => soundStates[s.id as SoundId]?.isPlaying);

  /** Check if a quick mix is currently the active set (ignores volume) */
  const isMixActive = (mix: Mix) => {
    const mixIds = mix.sounds as readonly string[];
    return (
      mixIds.length === activeSounds.length &&
      mixIds.every((id) => soundStates[id as SoundId]?.isPlaying)
    );
  };

  const [applyingMix, setApplyingMix] = useState<string | null>(null);

  const handleApplyMix = async (mix: Mix) => {
    if (mix.sounds.some((id) => isSoundLocked(id))) return;
    if (isMixActive(mix)) {
      await stopAll();
      return;
    }
    setApplyingMix(mix.label);
    await applyMix(mix.sounds);
    setApplyingMix(null);
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
            Layer sounds to build your focus environment
          </Text>
        </View>

        {/* Quick mixes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Mixes</Text>
            {activeSounds.length > 0 && isPremium && (
              <Pressable onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                stopAll();
              }} hitSlop={8}>
                <Text style={styles.stopAllText}>Stop all</Text>
              </Pressable>
            )}
          </View>

          {/* Gate: show lock card for free users, nothing while loading, mixes for premium */}
          {!isLoaded ? null : isPremium ? (
            <View style={styles.mixRow}>
              {QUICK_MIXES.map((mix) => (
                <MixButton
                  key={mix.label}
                  mix={mix}
                  isActive={isMixActive(mix)}
                  onPress={() => handleApplyMix(mix)}
                  disabled={applyingMix !== null && applyingMix !== mix.label}
                />
              ))}
            </View>
          ) : (
            <PremiumMixesLock mixes={QUICK_MIXES} onUpgrade={() => setPaywallVisible(true)} />
          )}
        </View>

        {/* Sounds list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sounds</Text>
            {activeSounds.length > 0 && (
              <Text style={styles.activeCount}>
                {activeSounds.length} playing
              </Text>
            )}
          </View>

          <Animated.View style={styles.soundList} layout={LinearTransition.springify().damping(20)}>
            {AMBIENT_SOUNDS.map((sound) => {
              const state = soundStates[sound.id as SoundId];
              const locked = isLoaded ? isSoundLocked(sound.id) : false;
              return (
                <SoundRow
                  key={sound.id}
                  sound={sound}
                  isPlaying={state?.isPlaying ?? false}
                  volume={state?.volume ?? 0.7}
                  onToggle={() => toggleSound(sound.id as SoundId)}
                  onVolume={(v) => setVolume(sound.id as SoundId, v)}
                  isLocked={locked}
                  onUnlock={async () => { await grantSoundUnlock(sound.id); }}
                />
              );
            })}
          </Animated.View>
        </View>

        {/* Drift cross-promo — free users only, not shown while checking or dismissed */}
        {isLoaded && !isPremium && driftCardVisible === true && (
          <DriftPromoCard
            onPress={handleDriftTap}
            onDismiss={handleDriftDismiss}
          />
        )}

        {/* Tip */}
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            💡  Replace the placeholder audio files in{' '}
            <Text style={styles.tipCode}>assets/sounds/</Text> with royalty-free
            loops for a real experience.
          </Text>
        </View>
      </ScrollView>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
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

  // ── Sections
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeCount: {
    fontSize: 12,
    color: COLORS.accent,
  },
  stopAllText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ── Quick mixes
  mixRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mixBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  mixBtnActive: {
    backgroundColor: 'rgba(232,168,124,0.12)',
    borderColor: 'rgba(232,168,124,0.35)',
  },
  mixBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  mixBtnTextActive: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  mixBtnDisabled: {
    opacity: 0.4,
  },

  // ── Premium mixes lock card
  mixLockCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  mixLockPreview: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    opacity: 0.35,
  },
  mixLockChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surfaceHighlight,
  },
  mixLockChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  mixLockCta: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  mixLockCtaText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // ── Sound list
  soundList: {
    gap: 2,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'transparent',
    gap: 0,
  },
  soundRowActive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginVertical: 2,
  },
  soundLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  soundIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  soundIconActive: {
    backgroundColor: 'rgba(232,168,124,0.12)',
    borderColor: 'rgba(232,168,124,0.3)',
  },
  soundEmoji: {
    fontSize: 22,
  },
  soundName: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  soundNameActive: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  soundSub: {
    fontSize: 11,
    marginTop: 1,
  },

  // ── Toggle button
  toggleBtn: {
    width: 36,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceHighlight,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  toggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textMuted,
  },
  toggleDotActive: {
    backgroundColor: COLORS.bgDark,
  },

  // ── Volume slider (spans full row when active)
  sliderWrap: {
    width: '100%',
    paddingLeft: 58,
    paddingRight: 4,
    paddingTop: 10,
    paddingBottom: 2,
  },

  // ── Locked sounds
  soundRowLocked: {
    opacity: 0.75,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 9,
  },
  lockedSub: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 1,
  },
  unlockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  unlockBtnText: {
    fontSize: 12,
  },

  // ── Tip
  tip: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 18,
  },
  tipCode: {
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
});
