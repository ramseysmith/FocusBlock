import { useState, useEffect } from 'react';
import { usePremium } from '../context/PremiumContext';
import {
  incrementAdSessionCount,
  unlockSoundFor24Hours,
  getActiveUnlocks,
} from '../lib/adStorage';
import { PREMIUM_SOUND_IDS } from '../constants/data';

// Module-level frequency cap (resets on app restart, not persisted)
let lastInterstitialShownAt: number | null = null;
const INTERSTITIAL_COOLDOWN_MS = 5 * 60 * 1000;
const AD_EVERY_N_SESSIONS = 3;

type UnlockMap = Record<string, number>; // soundId → expiry ms

interface UseAdsResult {
  onFocusSessionComplete: () => Promise<boolean>;
  isSoundLocked: (soundId: string) => boolean;
  grantSoundUnlock: (soundId: string) => Promise<void>;
  activeUnlocks: UnlockMap;
  isPremium: boolean;
  isLoaded: boolean;
}

export function useAds(): UseAdsResult {
  const { isPremium, isLoaded } = usePremium();
  const [activeUnlocks, setActiveUnlocks] = useState<UnlockMap>({});

  // Load active unlocks on mount
  useEffect(() => {
    getActiveUnlocks()
      .then(setActiveUnlocks)
      .catch(() => {});
  }, []);

  const onFocusSessionComplete = async (): Promise<boolean> => {
    if (isPremium) return false;

    const count = await incrementAdSessionCount();
    if (count % AD_EVERY_N_SESSIONS !== 0) return false;

    const now = Date.now();
    if (lastInterstitialShownAt !== null && now - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    lastInterstitialShownAt = now;
    return true;
  };

  const isSoundLocked = (soundId: string): boolean => {
    if (isPremium) return false;
    if (!PREMIUM_SOUND_IDS.has(soundId)) return false;
    const expiry = activeUnlocks[soundId];
    return expiry === undefined || expiry <= Date.now();
  };

  const grantSoundUnlock = async (soundId: string): Promise<void> => {
    try {
      await unlockSoundFor24Hours(soundId);
      const updated = await getActiveUnlocks();
      setActiveUnlocks(updated);
    } catch {}
  };

  return {
    onFocusSessionComplete,
    isSoundLocked,
    grantSoundUnlock,
    activeUnlocks,
    isPremium,
    isLoaded,
  };
}
