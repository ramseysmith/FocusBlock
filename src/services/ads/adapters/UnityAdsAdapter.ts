import type { ReactElement } from 'react';
import type { AdService, AdProviderConfig, AdType, BannerAdSize, RewardItem } from '../types';

const LOG = '[UnityAdsAdapter]';

// ── Optional SDK types ────────────────────────────────────────────────────────

type UnityAdsModule = {
  UnityAds: {
    initialize: (gameId: string, testMode: boolean) => Promise<void>;
    isReady: (placement: string) => boolean;
    show: (placement: string) => Promise<{ placementId: string; result: string }>;
  };
  BannerView: unknown; // component — typed as unknown, cast in renderBannerView
};

function loadSDK(): UnityAdsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-unity-ads') as UnityAdsModule;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class UnityAdsAdapter implements AdService {
  private sdk: UnityAdsModule | null = null;
  private config: AdProviderConfig | null = null;
  private _interstitialReady = false;
  private _rewardedReady = false;

  async initialize(config: AdProviderConfig): Promise<boolean> {
    try {
      this.sdk = loadSDK();
      this.config = config;
      const gameId = config.unityGameId ?? '';
      const testMode = !gameId || gameId === '1234567';
      await this.sdk.UnityAds.initialize(gameId, testMode);
      console.log(LOG, `Unity Ads SDK initialized (gameId=${gameId}, testMode=${testMode})`);
      // Poll readiness for a few seconds after init
      this._pollReady();
      return true;
    } catch (err) {
      console.warn(LOG, 'initialize() failed:', err);
      return false;
    }
  }

  private get interstitialPlacement(): string {
    return this.config?.unityInterstitialPlacement ?? 'Interstitial_Android';
  }

  private get rewardedPlacement(): string {
    return this.config?.unityRewardedPlacement ?? 'Rewarded_Android';
  }

  private get bannerPlacement(): string {
    return this.config?.unityBannerPlacement ?? 'Banner_Android';
  }

  /** Unity Ads doesn't have a readiness callback; poll until loaded. */
  private _pollReady(attempts = 10, intervalMs = 1000): void {
    if (!this.sdk || attempts <= 0) return;
    this._interstitialReady = this.sdk.UnityAds.isReady(this.interstitialPlacement);
    this._rewardedReady = this.sdk.UnityAds.isReady(this.rewardedPlacement);
    if (!this._interstitialReady || !this._rewardedReady) {
      setTimeout(() => this._pollReady(attempts - 1, intervalMs), intervalMs);
    }
  }

  renderBannerView(
    _placement: string,
    _size: BannerAdSize,
    _options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ): ReactElement | null {
    // Unity Ads banner support varies by SDK version — return null so AdManager
    // can fall back to Mock for banner rendering.
    console.warn(LOG, 'renderBannerView() — Unity banner not implemented; use MockAdAdapter for banners');
    return null;
  }

  showBanner(_placement: string): void {
    console.warn(LOG, 'showBanner() — Unity banner not implemented');
  }

  hideBanner(_placement: string): void {}

  async showInterstitial(): Promise<void> {
    if (!this.sdk) throw new Error('Unity Ads SDK not initialized');
    if (!this._interstitialReady) throw new Error('Interstitial not ready');
    const result = await this.sdk.UnityAds.show(this.interstitialPlacement);
    this._interstitialReady = false;
    this._pollReady(5, 1500);
    if (result.result !== 'completed') {
      throw new Error(`Unity interstitial result: ${result.result}`);
    }
  }

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    if (!this.sdk) throw new Error('Unity Ads SDK not initialized');
    if (!this._rewardedReady) throw new Error('Rewarded ad not ready');
    const result = await this.sdk.UnityAds.show(this.rewardedPlacement);
    this._rewardedReady = false;
    this._pollReady(5, 1500);
    if (result.result === 'completed') {
      onReward({ type: 'unity_reward', amount: 1 });
    }
  }

  isReady(adType: AdType): boolean {
    if (!this.sdk) return false;
    if (adType === 'interstitial') {
      return this._interstitialReady || this.sdk.UnityAds.isReady(this.interstitialPlacement);
    }
    if (adType === 'rewarded') {
      return this._rewardedReady || this.sdk.UnityAds.isReady(this.rewardedPlacement);
    }
    return false; // Unity banner support not implemented
  }

  async preload(_adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    // Unity Ads loads automatically after initialize; poll readiness.
    this._pollReady(5, 1000);
  }
}
