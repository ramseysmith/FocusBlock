import type { ExpoConfig, ConfigContext } from 'expo/config';
import { withUnityAds } from './plugins/withUnityAds';

// ── Ad provider ────────────────────────────────────────────────────────────────
// Change this one value (or set AD_PROVIDER env var) to swap ad networks.
export const AD_PROVIDER = (
  process.env.AD_PROVIDER ?? 'mock'
) as 'admob' | 'unity' | 'mock';

// ── Ad mediation ───────────────────────────────────────────────────────────────
// When true, AdManager uses MediatedAdAdapter (AdMob primary → Unity fallback)
// regardless of AD_PROVIDER. Flip to true when you're ready to run a waterfall.
export const MEDIATION_ENABLED = process.env.MEDIATION_ENABLED === 'true';

// ── AdMob app IDs ─────────────────────────────────────────────────────────────
// Google's public test app IDs — safe for development builds.
// Replace with real IDs from https://apps.admob.com before shipping.
const ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios:     'ca-app-pub-3940256099942544~1458002511',
} as const;

// ── Config ─────────────────────────────────────────────────────────────────────
export default function config({ config }: ConfigContext): ExpoConfig {
  const admobAndroidAppId = process.env.ADMOB_ANDROID_APP_ID || ADMOB_TEST_APP_IDS.android;
  const admobIosAppId     = process.env.ADMOB_IOS_APP_ID     || ADMOB_TEST_APP_IDS.ios;

  return {
    ...config,
    name: 'FocusBlock',
    slug: 'FocusBlock',

    // Merge existing plugins (expo-router, expo-notifications) with new ones.
    plugins: [
      ...(Array.isArray(config.plugins) ? config.plugins : []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: admobAndroidAppId,
          iosAppId:     admobIosAppId,
        },
      ],
      withUnityAds,
    ],

    extra: {
      ...config.extra,

      // Which ad SDK to use: 'admob' | 'unity' | 'mock'
      adProvider: AD_PROVIDER,

      // When true, AdManager runs a mediated waterfall (AdMob → Unity).
      // AD_PROVIDER is ignored while mediation is enabled.
      mediationEnabled: MEDIATION_ENABLED,

      // AdMob ── app IDs (injected into AndroidManifest / Info.plist by plugin)
      admobAndroidAppId,
      admobIosAppId,

      // AdMob ── ad unit IDs (per placement, per platform)
      admobBannerAndroid:       process.env.ADMOB_BANNER_ANDROID       ?? '',
      admobBannerIos:           process.env.ADMOB_BANNER_IOS           ?? '',
      admobInterstitialAndroid: process.env.ADMOB_INTERSTITIAL_ANDROID ?? '',
      admobInterstitialIos:     process.env.ADMOB_INTERSTITIAL_IOS     ?? '',
      admobRewardedAndroid:     process.env.ADMOB_REWARDED_ANDROID     ?? '',
      admobRewardedIos:         process.env.ADMOB_REWARDED_IOS         ?? '',

      // Unity Ads ── game ID
      unityGameId: process.env.UNITY_GAME_ID ?? '',

      // Unity Ads ── placement IDs (iOS and Android separate)
      unityBannerPlacementIos:     process.env.UNITY_BANNER_PLACEMENT_IOS     ?? 'Banner_iOS',
      unityBannerPlacementAndroid: process.env.UNITY_BANNER_PLACEMENT_ANDROID ?? 'Banner_Android',

      unityInterstitialPlacementIos:     process.env.UNITY_INTERSTITIAL_PLACEMENT_IOS     ?? 'Interstitial_iOS',
      unityInterstitialPlacementAndroid: process.env.UNITY_INTERSTITIAL_PLACEMENT_ANDROID ?? 'Interstitial_Android',

      unityRewardedPlacementIos:     process.env.UNITY_REWARDED_PLACEMENT_IOS     ?? 'Rewarded_iOS',
      unityRewardedPlacementAndroid: process.env.UNITY_REWARDED_PLACEMENT_ANDROID ?? 'Rewarded_Android',

      // Legacy flat Unity keys — kept so UnityAdsAdapter fallback still works
      // if caller reads config.unityBannerPlacement directly.
      unityBannerPlacement:       process.env.UNITY_BANNER_PLACEMENT       ?? 'Banner_Android',
      unityInterstitialPlacement: process.env.UNITY_INTERSTITIAL_PLACEMENT ?? 'Interstitial_Android',
      unityRewardedPlacement:     process.env.UNITY_REWARDED_PLACEMENT     ?? 'Rewarded_Android',
    },
  };
}
