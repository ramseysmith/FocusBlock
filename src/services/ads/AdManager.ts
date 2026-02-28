import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AdService, AdProviderConfig, AdProvider, AdType, BannerAdSize, RewardItem } from './types';
import type { ReactElement } from 'react';
import { getAdUnits } from '../../config/adUnits';

const LOG = '[AdManager]';

// ── Config from app.config.ts extra + adUnits placement map ───────────────────
//
// Unit IDs come from adUnits.ts (placement-aware, reads Constants.expoConfig.extra
// at call time and falls back to Google test IDs).
// App IDs and SDK credentials still come directly from extra.

function readConfig(): AdProviderConfig {
  const extra = Constants.expoConfig?.extra ?? {};
  const provider: AdProvider = (extra.adProvider as AdProvider) ?? 'mock';

  // Resolve per-placement unit IDs for all three placements.
  const units = getAdUnits();
  const os = Platform.OS;

  return {
    provider,

    // AdMob app IDs (needed by the native plugin, not unit IDs)
    admobAndroidAppId: extra.admobAndroidAppId,
    admobIosAppId:     extra.admobIosAppId,

    // AdMob unit IDs — resolved from placement config, keyed by platform
    admobBannerAndroid:           units.banner_stats.admob.android,
    admobBannerIos:               units.banner_stats.admob.ios,
    admobInterstitialAndroid:     units.interstitial_session.admob.android,
    admobInterstitialIos:         units.interstitial_session.admob.ios,
    admobRewardedAndroid:         units.rewarded_unlock.admob.android,
    admobRewardedIos:             units.rewarded_unlock.admob.ios,

    // Unity credentials
    unityGameId: extra.unityGameId,

    // Unity placement IDs — resolved per platform from placement config
    unityBannerPlacement:       os === 'ios' ? units.banner_stats.unity.ios         : units.banner_stats.unity.android,
    unityInterstitialPlacement: os === 'ios' ? units.interstitial_session.unity.ios : units.interstitial_session.unity.android,
    unityRewardedPlacement:     os === 'ios' ? units.rewarded_unlock.unity.ios      : units.rewarded_unlock.unity.android,
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
