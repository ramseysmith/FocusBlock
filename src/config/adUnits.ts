import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AdProvider } from '../services/ads/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlacementId = 'banner_stats' | 'interstitial_session' | 'rewarded_unlock';

interface PlatformPair {
  ios: string;
  android: string;
}

export interface PlacementConfig {
  admob: PlatformPair;
  unity: PlatformPair;
}

// ── Google test ad unit IDs ───────────────────────────────────────────────────
// Safe to use during development — never show real ads in test builds.
// Source: https://developers.google.com/admob/android/test-ads

const ADMOB_TEST_IDS = {
  banner:       { ios: 'ca-app-pub-3940256099942544/2934735716', android: 'ca-app-pub-3940256099942544/6300978111' },
  interstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
  rewarded:     { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' },
} as const;

// ── Runtime extra access ──────────────────────────────────────────────────────
// expo-constants is populated by the time any screen renders, so lazy access is safe.

function extra(): Record<string, string> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
}

// ── Placement map ─────────────────────────────────────────────────────────────
// Each placement maps to provider-specific ad unit IDs per platform.
// Real IDs are read from app.config.ts `extra` (populated from .env at build time).
// Falls back to Google's official test IDs so development always works.

export function getAdUnits(): Record<PlacementId, PlacementConfig> {
  const ex = extra();
  return {
    banner_stats: {
      admob: {
        ios:     ex.admobBannerIos     || ADMOB_TEST_IDS.banner.ios,
        android: ex.admobBannerAndroid || ADMOB_TEST_IDS.banner.android,
      },
      unity: {
        ios:     ex.unityBannerPlacementIos     || 'Banner_iOS',
        android: ex.unityBannerPlacementAndroid || 'Banner_Android',
      },
    },

    interstitial_session: {
      admob: {
        ios:     ex.admobInterstitialIos     || ADMOB_TEST_IDS.interstitial.ios,
        android: ex.admobInterstitialAndroid || ADMOB_TEST_IDS.interstitial.android,
      },
      unity: {
        ios:     ex.unityInterstitialPlacementIos     || 'Interstitial_iOS',
        android: ex.unityInterstitialPlacementAndroid || 'Interstitial_Android',
      },
    },

    rewarded_unlock: {
      admob: {
        ios:     ex.admobRewardedIos     || ADMOB_TEST_IDS.rewarded.ios,
        android: ex.admobRewardedAndroid || ADMOB_TEST_IDS.rewarded.android,
      },
      unity: {
        ios:     ex.unityRewardedPlacementIos     || 'Rewarded_iOS',
        android: ex.unityRewardedPlacementAndroid || 'Rewarded_Android',
      },
    },
  };
}

// ── Resolution helper ─────────────────────────────────────────────────────────

/**
 * Resolves a placement name to a concrete ad unit ID string for the given
 * provider and the current runtime platform.
 *
 * Returns '' for provider='mock' — the mock adapter ignores unit IDs entirely.
 */
export function resolveAdUnitId(placement: string, provider: AdProvider): string {
  if (provider === 'mock') return '';
  const units = getAdUnits();
  const config = units[placement as PlacementId];
  if (!config) return '';
  const providerCfg = config[provider as 'admob' | 'unity'];
  if (!providerCfg) return '';
  return Platform.OS === 'ios' ? providerCfg.ios : providerCfg.android;
}
