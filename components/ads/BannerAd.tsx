import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AdManager } from '../../src/services/ads/AdManager';
import type { BannerAdSize } from '../../src/services/ads/types';
import { COLORS } from '../../constants/theme';

interface BannerAdProps {
  placement: string;
  size?: BannerAdSize;
  style?: object;
}

export function BannerAd({ placement, size = 'banner', style }: BannerAdProps) {
  const [adElement, setAdElement] = useState<React.ReactElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AdManager.renderBannerView(placement, size, {
      onAdLoaded: () => {
        if (!cancelled) setLoading(false);
      },
      onAdFailedToLoad: () => {
        if (!cancelled) {
          setLoading(false);
          setFailed(true);
        }
      },
    }).then((el) => {
      if (!cancelled) {
        setAdElement(el);
        // If the adapter resolves but the ad didn't call onAdLoaded (e.g. Mock)
        // we clear loading after a short grace period
        setTimeout(() => { if (!cancelled) setLoading(false); }, 200);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        setFailed(true);
      }
    });

    return () => { cancelled = true; };
  }, [placement, size]);

  if (failed || (!loading && !adElement)) return null;

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <ActivityIndicator size="small" color={COLORS.textMuted} style={styles.spinner} />
      )}
      {adElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  spinner: {
    position: 'absolute',
  },
});
