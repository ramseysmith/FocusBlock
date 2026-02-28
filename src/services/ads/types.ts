import type { ReactElement } from 'react';

// ── Enumerations ───────────────────────────────────────────────────────────────

export type AdProvider = 'admob' | 'unity' | 'mock';

export type AdType = 'banner' | 'interstitial' | 'rewarded';

export type BannerAdSize =
  | 'banner'        // 320×50
  | 'largeBanner'   // 320×100
  | 'mediumRectangle' // 300×250
  | 'fullBanner'    // 468×60
  | 'leaderboard'   // 728×90
  | 'adaptiveBanner'; // full-width adaptive

// ── Value types ────────────────────────────────────────────────────────────────

export interface RewardItem {
  type: string;
  amount: number;
}

export interface AdProviderConfig {
  provider: AdProvider;
  // AdMob
  admobAndroidAppId?: string;
  admobIosAppId?: string;
  admobBannerAndroid?: string;
  admobBannerIos?: string;
  admobInterstitialAndroid?: string;
  admobInterstitialIos?: string;
  admobRewardedAndroid?: string;
  admobRewardedIos?: string;
  // Unity
  unityGameId?: string;
  unityBannerPlacement?: string;
  unityInterstitialPlacement?: string;
  unityRewardedPlacement?: string;
}

// ── AdService interface ────────────────────────────────────────────────────────

export interface AdService {
  /**
   * Initialize the underlying SDK.  Must be called once before any other method.
   * Resolves to `true` if the SDK initialized successfully, `false` otherwise.
   */
  initialize(config: AdProviderConfig): Promise<boolean>;

  /**
   * Renders a banner ad view for `placement` at the given `size`.
   * Returns a React element that can be embedded in any component tree, or
   * `null` if the provider doesn't support inline banner rendering.
   */
  renderBannerView(
    placement: string,
    size: BannerAdSize,
    options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ): ReactElement | null;

  /** Signal that a banner should be shown (for providers that control display separately). */
  showBanner(placement: string): void;

  /** Hide / destroy the active banner. */
  hideBanner(placement: string): void;

  /**
   * Show a full-screen interstitial ad.
   * Resolves when the ad is dismissed or rejects if no ad is ready.
   */
  showInterstitial(): Promise<void>;

  /**
   * Show a rewarded ad.  Calls `onReward` if the user earns the reward.
   * Resolves when the ad is dismissed or rejects if no ad is ready.
   */
  showRewarded(onReward: (reward: RewardItem) => void): Promise<void>;

  /**
   * Returns `true` if an ad of `type` is loaded and ready to display.
   */
  isReady(adType: AdType): boolean;

  /**
   * Pre-load the next interstitial/rewarded ad so it's ready when needed.
   * No-op for providers that load automatically.
   */
  preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void>;
}
