import React, { useEffect, useState, useRef } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AdManager } from '../../src/services/ads/AdManager';
import type { RewardItem } from '../../src/services/ads/types';
import { COLORS } from '../../constants/theme';

interface RewardedAdButtonProps {
  onReward: (reward: RewardItem) => void;
  onError?: (error: Error) => void;
  placement?: string;
  label?: string;
  loadingLabel?: string;
  style?: object;
  textStyle?: object;
  disabled?: boolean;
}

/**
 * A button that plays a rewarded ad when pressed.
 * Disables itself while the ad is loading / showing.
 * Calls `onReward` if the user completes the ad and earns a reward.
 */
export function RewardedAdButton({
  onReward,
  onError,
  placement = 'rewarded_default',
  label = 'Watch ad',
  loadingLabel = 'Loading…',
  style,
  textStyle,
  disabled = false,
}: RewardedAdButtonProps) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Preload on mount
    AdManager.preload('rewarded')
      .then(() => { if (mountedRef.current) setReady(true); })
      .catch(() => { if (mountedRef.current) setReady(false); });
    return () => { mountedRef.current = false; };
  }, []);

  // Poll readiness every 2 s so the button re-enables after a reward
  useEffect(() => {
    const id = setInterval(() => {
      if (mountedRef.current) setReady(AdManager.isReady('rewarded'));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const handlePress = async () => {
    if (busy || disabled) return;
    console.log('[RewardedAdButton] showing rewarded ad, placement:', placement);
    setBusy(true);
    try {
      await AdManager.showRewarded(onReward);
      // Preload next
      AdManager.preload('rewarded').catch(() => {});
      if (mountedRef.current) setReady(false);
    } catch (err) {
      onError?.(err as Error);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const isDisabled = disabled || busy || !ready;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[styles.btn, isDisabled && styles.btnDisabled, style]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.bgDark} />
      ) : (
        <Text style={[styles.label, isDisabled && styles.labelDisabled, textStyle]}>
          {!ready ? loadingLabel : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bgDark,
  },
  labelDisabled: {
    color: COLORS.bgDark,
  },
});
