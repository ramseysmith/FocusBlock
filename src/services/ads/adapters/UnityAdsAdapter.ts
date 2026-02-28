import type { ReactElement } from 'react';
import type { AdService, AdProviderConfig, AdType, BannerAdSize, RewardItem } from '../types';

const LOG = '[UnityAdsAdapter]';

// ── Lazy import of the local Expo native module ───────────────────────────────
// expo-unity-ads is a local module (modules/expo-unity-ads) built against
// Unity Ads SDK 4.x. It exposes a clean promise-based API:
//   initialize(gameId, testMode) → Promise<void>
//   load(placementId)            → Promise<void>
//   show(placementId)            → Promise<{ placementId, completed }>
//   isInitialized()              → boolean
//   isLoaded(placementId)        → boolean
//
// requireNativeModule() throws if the native binary wasn't compiled in
// (i.e. Expo Go). loadSDK() wraps that in a try/catch so AdManager can
// gracefully fall back to MockAdAdapter on unsupported builds.

type ExpoUnityAdsModule = {
  initialize(gameId: string, testMode: boolean): Promise<void>;
  load(placementId: string): Promise<void>;
  show(placementId: string): Promise<{ placementId: string; completed: boolean }>;
  isInitialized(): boolean;
  isLoaded(placementId: string): boolean;
};

function loadSDK(): ExpoUnityAdsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-unity-ads') as ExpoUnityAdsModule;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class UnityAdsAdapter implements AdService {
  private sdk: ExpoUnityAdsModule | null = null;
  private config: AdProviderConfig | null = null;

  // Track whether we've issued a load() call and it resolved.
  // Unity Ads 4.x requires an explicit load() before each show().
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;

  // ── Placement helpers ───────────────────────────────────────────────────────

  private get interstitialPlacement(): string {
    return this.config?.unityInterstitialPlacement ?? 'Interstitial_Android';
  }

  private get rewardedPlacement(): string {
    return this.config?.unityRewardedPlacement ?? 'Rewarded_Android';
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async initialize(config: AdProviderConfig): Promise<boolean> {
    try {
      this.sdk = loadSDK();
      this.config = config;

      const gameId = config.unityGameId ?? '';
      const testMode = !gameId || gameId === '1234567';

      await this.sdk.initialize(gameId, testMode);
      console.log(LOG, `initialized (gameId=${gameId}, testMode=${testMode})`);

      // Pre-load interstitial + rewarded after init
      void this._loadInterstitial();
      void this._loadRewarded();
      return true;
    } catch (err) {
      console.warn(LOG, 'initialize() failed:', err);
      return false;
    }
  }

  // ── Internal load helpers ───────────────────────────────────────────────────

  private async _loadInterstitial(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.load(this.interstitialPlacement);
      this._interstitialLoaded = true;
      console.log(LOG, `interstitial loaded (${this.interstitialPlacement})`);
    } catch (err) {
      console.warn(LOG, 'interstitial load failed:', err);
      this._interstitialLoaded = false;
    }
  }

  private async _loadRewarded(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.load(this.rewardedPlacement);
      this._rewardedLoaded = true;
      console.log(LOG, `rewarded loaded (${this.rewardedPlacement})`);
    } catch (err) {
      console.warn(LOG, 'rewarded load failed:', err);
      this._rewardedLoaded = false;
    }
  }

  // ── Banner (not supported) ──────────────────────────────────────────────────

  renderBannerView(
    _placement: string,
    _size: BannerAdSize,
    _options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ): ReactElement | null {
    console.warn(LOG, 'renderBannerView() — Unity banner not implemented; AdManager will fall back to MockAdAdapter');
    return null;
  }

  showBanner(_placement: string): void {
    console.warn(LOG, 'showBanner() — Unity banner not implemented');
  }

  hideBanner(_placement: string): void {}

  // ── Interstitial ────────────────────────────────────────────────────────────

  async showInterstitial(): Promise<void> {
    if (!this.sdk) throw new Error('Unity Ads SDK not initialized');
    if (!this._interstitialLoaded) throw new Error('Interstitial not ready — call preload() first');

    this._interstitialLoaded = false;
    await this.sdk.show(this.interstitialPlacement);

    // Pre-load the next interstitial in the background
    void this._loadInterstitial();
  }

  // ── Rewarded ────────────────────────────────────────────────────────────────

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    if (!this.sdk) throw new Error('Unity Ads SDK not initialized');
    if (!this._rewardedLoaded) throw new Error('Rewarded ad not ready — call preload() first');

    this._rewardedLoaded = false;
    const result = await this.sdk.show(this.rewardedPlacement);

    if (result.completed) {
      onReward({ type: 'unity_reward', amount: 1 });
    }

    // Pre-load the next rewarded ad in the background
    void this._loadRewarded();
  }

  // ── isReady ─────────────────────────────────────────────────────────────────

  isReady(adType: AdType): boolean {
    if (!this.sdk) return false;
    if (adType === 'interstitial') {
      // Check both our local flag and the native isLoaded() for consistency
      return this._interstitialLoaded && this.sdk.isLoaded(this.interstitialPlacement);
    }
    if (adType === 'rewarded') {
      return this._rewardedLoaded && this.sdk.isLoaded(this.rewardedPlacement);
    }
    return false; // Unity banner not implemented
  }

  // ── preload ─────────────────────────────────────────────────────────────────

  async preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    if (adType === 'interstitial') {
      await this._loadInterstitial();
    } else {
      await this._loadRewarded();
    }
  }
}
