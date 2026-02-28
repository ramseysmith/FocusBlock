import type { ExpoConfig, ConfigContext } from 'expo/config';

// ── Ad provider ────────────────────────────────────────────────────────────────
// Change this one value (or set AD_PROVIDER env var) to swap ad networks.
export const AD_PROVIDER = (
  process.env.AD_PROVIDER ?? 'mock'
) as 'admob' | 'unity' | 'mock';

// ── Config ─────────────────────────────────────────────────────────────────────
export default function config({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: 'FocusBlock',
    slug: 'FocusBlock',
    extra: {
      ...config.extra,

      // Which ad SDK to use: 'admob' | 'unity' | 'mock'
      adProvider: AD_PROVIDER,

      // AdMob ── app IDs (required in AndroidManifest / Info.plist for AdMob)
      admobAndroidAppId: process.env.ADMOB_ANDROID_APP_ID ?? '',
      admobIosAppId:     process.env.ADMOB_IOS_APP_ID     ?? '',

      // AdMob ── ad unit IDs
      admobBannerAndroid:       process.env.ADMOB_BANNER_ANDROID       ?? '',
      admobBannerIos:           process.env.ADMOB_BANNER_IOS           ?? '',
      admobInterstitialAndroid: process.env.ADMOB_INTERSTITIAL_ANDROID ?? '',
      admobInterstitialIos:     process.env.ADMOB_INTERSTITIAL_IOS     ?? '',
      admobRewardedAndroid:     process.env.ADMOB_REWARDED_ANDROID     ?? '',
      admobRewardedIos:         process.env.ADMOB_REWARDED_IOS         ?? '',

      // Unity Ads ── game ID (single ID covers both platforms in newer SDK)
      unityGameId: process.env.UNITY_GAME_ID ?? '',

      // Unity Ads ── placement IDs
      unityBannerPlacement:       process.env.UNITY_BANNER_PLACEMENT       ?? 'Banner_Android',
      unityInterstitialPlacement: process.env.UNITY_INTERSTITIAL_PLACEMENT ?? 'Interstitial_Android',
      unityRewardedPlacement:     process.env.UNITY_REWARDED_PLACEMENT     ?? 'Rewarded_Android',
    },
  };
}
