import Constants from 'expo-constants';
import type { AdService, AdProviderConfig, AdProvider, AdType, BannerAdSize, RewardItem } from './types';
import type { ReactElement } from 'react';

const LOG = '[AdManager]';

// ── Config from app.config.ts extra ───────────────────────────────────────────

function readConfig(): AdProviderConfig {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    provider:                     (extra.adProvider as AdProvider) ?? 'mock',
    admobAndroidAppId:            extra.admobAndroidAppId,
    admobIosAppId:                extra.admobIosAppId,
    admobBannerAndroid:           extra.admobBannerAndroid,
    admobBannerIos:               extra.admobBannerIos,
    admobInterstitialAndroid:     extra.admobInterstitialAndroid,
    admobInterstitialIos:         extra.admobInterstitialIos,
    admobRewardedAndroid:         extra.admobRewardedAndroid,
    admobRewardedIos:             extra.admobRewardedIos,
    unityGameId:                  extra.unityGameId,
    unityBannerPlacement:         extra.unityBannerPlacement,
    unityInterstitialPlacement:   extra.unityInterstitialPlacement,
    unityRewardedPlacement:       extra.unityRewardedPlacement,
  };
}

// ── Lazy adapter loading ───────────────────────────────────────────────────────

async function createAdapter(provider: AdProvider): Promise<AdService> {
  switch (provider) {
    case 'admob': {
      const { AdMobAdapter } = await import('./adapters/AdMobAdapter');
      return new AdMobAdapter();
    }
    case 'unity': {
      const { UnityAdsAdapter } = await import('./adapters/UnityAdsAdapter');
      return new UnityAdsAdapter();
    }
    default: {
      const { MockAdAdapter } = await import('./adapters/MockAdAdapter');
      return new MockAdAdapter();
    }
  }
}

async function createMock(): Promise<AdService> {
  const { MockAdAdapter } = await import('./adapters/MockAdAdapter');
  return new MockAdAdapter();
}

// ── Singleton ─────────────────────────────────────────────────────────────────

class AdManagerClass {
  private adapter: AdService | null = null;
  private initPromise: Promise<void> | null = null;

  /** Call once at app startup (e.g. in _layout.tsx useEffect). */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const config = readConfig();
      console.log(LOG, `Initializing provider: ${config.provider}`);

      try {
        const adapter = await createAdapter(config.provider);
        const ok = await adapter.initialize(config);
        if (ok) {
          this.adapter = adapter;
          console.log(LOG, `Provider ${config.provider} ready`);
          return;
        }
        throw new Error(`${config.provider} adapter returned false from initialize()`);
      } catch (err) {
        console.warn(LOG, `Provider "${config.provider}" failed, falling back to mock:`, err);
        try {
          const mock = await createMock();
          await mock.initialize(config);
          this.adapter = mock;
          console.log(LOG, 'Fallback mock adapter ready');
        } catch (mockErr) {
          console.error(LOG, 'Even mock adapter failed:', mockErr);
        }
      }
    })();

    return this.initPromise;
  }

  /** Ensure initialized before delegating — safe to call from any component. */
  private async ensureInitialized(): Promise<AdService> {
    if (!this.adapter) await this.initialize();
    if (!this.adapter) throw new Error('AdManager: no adapter available');
    return this.adapter;
  }

  async renderBannerView(
    placement: string,
    size: BannerAdSize,
    options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ): Promise<ReactElement | null> {
    const adapter = await this.ensureInitialized();
    return adapter.renderBannerView(placement, size, options);
  }

  async showBanner(placement: string): Promise<void> {
    const adapter = await this.ensureInitialized();
    adapter.showBanner(placement);
  }

  async hideBanner(placement: string): Promise<void> {
    const adapter = await this.ensureInitialized();
    adapter.hideBanner(placement);
  }

  async showInterstitial(): Promise<void> {
    const adapter = await this.ensureInitialized();
    await adapter.showInterstitial();
  }

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    const adapter = await this.ensureInitialized();
    await adapter.showRewarded(onReward);
  }

  isReady(adType: AdType): boolean {
    return this.adapter?.isReady(adType) ?? false;
  }

  async preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    const adapter = await this.ensureInitialized();
    await adapter.preload(adType);
  }
}

export const AdManager = new AdManagerClass();
