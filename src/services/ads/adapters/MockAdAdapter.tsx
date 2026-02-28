import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AdService, AdProviderConfig, AdType, BannerAdSize, RewardItem } from '../types';

const LOG = '[MockAdAdapter]';

export class MockAdAdapter implements AdService {
  private initialized = false;
  private interstitialReady = true;
  private rewardedReady = true;

  async initialize(_config: AdProviderConfig): Promise<boolean> {
    console.log(LOG, 'initialize() — mock SDK ready');
    this.initialized = true;
    return true;
  }

  renderBannerView(
    placement: string,
    size: BannerAdSize,
    options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ) {
    console.log(LOG, `renderBannerView(${placement}, ${size})`);
    // Fire onAdLoaded asynchronously to mimic real SDK behaviour
    setTimeout(() => options?.onAdLoaded?.(), 100);
    return <MockBannerView placement={placement} size={size} />;
  }

  showBanner(placement: string): void {
    console.log(LOG, `showBanner(${placement})`);
  }

  hideBanner(placement: string): void {
    console.log(LOG, `hideBanner(${placement})`);
  }

  async showInterstitial(): Promise<void> {
    console.log(LOG, 'showInterstitial()');
    if (!this.initialized) throw new Error('MockAdAdapter not initialized');
    if (!this.interstitialReady) throw new Error('Interstitial not ready');
    // Simulate ad display time
    await new Promise((r) => setTimeout(r, 500));
    this.interstitialReady = false;
    // Auto-reload for next time
    setTimeout(() => { this.interstitialReady = true; }, 1000);
  }

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    console.log(LOG, 'showRewarded()');
    if (!this.initialized) throw new Error('MockAdAdapter not initialized');
    if (!this.rewardedReady) throw new Error('Rewarded ad not ready');
    await new Promise((r) => setTimeout(r, 500));
    onReward({ type: 'mock_reward', amount: 1 });
    this.rewardedReady = false;
    setTimeout(() => { this.rewardedReady = true; }, 1000);
  }

  isReady(adType: AdType): boolean {
    if (!this.initialized) return false;
    if (adType === 'interstitial') return this.interstitialReady;
    if (adType === 'rewarded') return this.rewardedReady;
    return true; // banner always ready
  }

  async preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    console.log(LOG, `preload(${adType})`);
    await new Promise((r) => setTimeout(r, 200));
    if (adType === 'interstitial') this.interstitialReady = true;
    if (adType === 'rewarded') this.rewardedReady = true;
  }
}

// ── Visible placeholder banner ────────────────────────────────────────────────

const BANNER_HEIGHTS: Record<BannerAdSize, number> = {
  banner: 50,
  largeBanner: 100,
  mediumRectangle: 250,
  fullBanner: 60,
  leaderboard: 90,
  adaptiveBanner: 60,
};

function MockBannerView({ placement, size }: { placement: string; size: BannerAdSize }) {
  const height = BANNER_HEIGHTS[size] ?? 50;
  return (
    <View style={[styles.banner, { height }]}>
      <Text style={styles.label}>Ad Space · {placement}</Text>
      <Text style={styles.sub}>{size} · mock</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: 'rgba(232,168,124,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.25)',
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: 'rgba(232,168,124,0.8)',
    fontWeight: '500',
  },
  sub: {
    fontSize: 10,
    color: 'rgba(232,168,124,0.45)',
    marginTop: 2,
  },
});
