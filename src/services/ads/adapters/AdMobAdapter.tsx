import React from 'react';
import { Platform } from 'react-native';
import type { AdService, AdProviderConfig, AdType, BannerAdSize, RewardItem } from '../types';

const LOG = '[AdMobAdapter]';

// ── Optional SDK types (only present when react-native-google-mobile-ads is installed) ──

type RNGMAModule = {
  default: { initialize: () => Promise<void[]> };
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
  }>;
  BannerAdSize: Record<string, string>;
  InterstitialAd: {
    createForAdRequest: (unitId: string) => {
      load: () => void;
      show: () => Promise<void>;
      loaded: boolean;
      addAdEventListener: (event: string, cb: (...args: unknown[]) => void) => { remove: () => void };
    };
  };
  RewardedAd: {
    createForAdRequest: (unitId: string) => {
      load: () => void;
      show: () => Promise<void>;
      loaded: boolean;
      addAdEventListener: (event: string, cb: (...args: unknown[]) => void) => { remove: () => void };
    };
  };
  RewardedAdEventType: { EARNED_REWARD: string; LOADED: string };
  AdEventType: { LOADED: string };
};

function loadSDK(): RNGMAModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-google-mobile-ads') as RNGMAModule;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class AdMobAdapter implements AdService {
  private sdk: RNGMAModule | null = null;
  private config: AdProviderConfig | null = null;
  private interstitial: ReturnType<RNGMAModule['InterstitialAd']['createForAdRequest']> | null = null;
  private rewarded: ReturnType<RNGMAModule['RewardedAd']['createForAdRequest']> | null = null;

  async initialize(config: AdProviderConfig): Promise<boolean> {
    try {
      this.sdk = loadSDK();
      this.config = config;
      await this.sdk.default.initialize();
      console.log(LOG, 'AdMob SDK initialized');
      this._loadInterstitial();
      this._loadRewarded();
      return true;
    } catch (err) {
      console.warn(LOG, 'initialize() failed:', err);
      return false;
    }
  }

  private get bannerUnitId(): string {
    return (
      Platform.OS === 'android'
        ? this.config?.admobBannerAndroid
        : this.config?.admobBannerIos
    ) ?? '';
  }

  private get interstitialUnitId(): string {
    return (
      Platform.OS === 'android'
        ? this.config?.admobInterstitialAndroid
        : this.config?.admobInterstitialIos
    ) ?? '';
  }

  private get rewardedUnitId(): string {
    return (
      Platform.OS === 'android'
        ? this.config?.admobRewardedAndroid
        : this.config?.admobRewardedIos
    ) ?? '';
  }

  renderBannerView(
    _placement: string,
    size: BannerAdSize,
    options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ) {
    if (!this.sdk) return null;
    const { BannerAd, BannerAdSize: SizeMap } = this.sdk;

    // Map our size enum to AdMob's string constants
    const sizeMap: Record<BannerAdSize, string> = {
      banner:          SizeMap.BANNER,
      largeBanner:     SizeMap.LARGE_BANNER,
      mediumRectangle: SizeMap.MEDIUM_RECTANGLE,
      fullBanner:      SizeMap.FULL_BANNER,
      leaderboard:     SizeMap.LEADERBOARD,
      adaptiveBanner:  SizeMap.ANCHORED_ADAPTIVE_BANNER ?? SizeMap.BANNER,
    };

    return (
      <BannerAd
        unitId={this.bannerUnitId}
        size={sizeMap[size] ?? SizeMap.BANNER}
        onAdLoaded={options?.onAdLoaded}
        onAdFailedToLoad={options?.onAdFailedToLoad}
      />
    );
  }

  showBanner(_placement: string): void {
    // BannerAd is rendered inline via renderBannerView; no imperative show needed.
  }

  hideBanner(_placement: string): void {
    // Unmount the component returned by renderBannerView to hide.
  }

  async showInterstitial(): Promise<void> {
    if (!this.interstitial?.loaded) throw new Error('Interstitial not ready');
    await this.interstitial.show();
    this._loadInterstitial(); // preload next
  }

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    if (!this.sdk) throw new Error('AdMob SDK not initialized');
    if (!this.rewarded?.loaded) throw new Error('Rewarded ad not ready');

    await new Promise<void>((resolve, reject) => {
      const { RewardedAdEventType } = this.sdk!;
      const sub1 = this.rewarded!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: unknown) => {
          const r = reward as { type: string; amount: number };
          onReward({ type: r.type, amount: r.amount });
        }
      );
      this.rewarded!.show().then(() => {
        sub1.remove();
        resolve();
        this._loadRewarded();
      }).catch((err: Error) => {
        sub1.remove();
        reject(err);
      });
    });
  }

  isReady(adType: AdType): boolean {
    if (!this.sdk) return false;
    if (adType === 'interstitial') return this.interstitial?.loaded ?? false;
    if (adType === 'rewarded') return this.rewarded?.loaded ?? false;
    return true;
  }

  async preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    if (adType === 'interstitial') this._loadInterstitial();
    if (adType === 'rewarded') this._loadRewarded();
  }

  private _loadInterstitial(): void {
    if (!this.sdk || !this.interstitialUnitId) return;
    try {
      this.interstitial = this.sdk.InterstitialAd.createForAdRequest(this.interstitialUnitId);
      this.interstitial.load();
    } catch (err) {
      console.warn(LOG, '_loadInterstitial failed:', err);
    }
  }

  private _loadRewarded(): void {
    if (!this.sdk || !this.rewardedUnitId) return;
    try {
      this.rewarded = this.sdk.RewardedAd.createForAdRequest(this.rewardedUnitId);
      this.rewarded.load();
    } catch (err) {
      console.warn(LOG, '_loadRewarded failed:', err);
    }
  }
}
