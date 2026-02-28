import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { PurchaseManager } from '../src/services/purchases/PurchaseManager';
import type { PurchasePackage, Offering, PurchaseResult } from '../src/services/purchases/types';

interface PremiumContextValue {
  isPremium: boolean;
  isLoaded: boolean;      // true once PurchaseManager resolves; keeps useAds.ts + stats.tsx working
  loading: boolean;
  currentPlan: PurchasePackage | null;
  offerings: Offering[];
  purchasePackage: (packageId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoaded: false,
  loading: true,
  currentPlan: null,
  offerings: [],
  purchasePackage: async () => { throw new Error('PremiumProvider not mounted'); },
  restorePurchases: async () => { throw new Error('PremiumProvider not mounted'); },
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PurchasePackage | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await PurchaseManager.initialize();
        const [premium, offs] = await Promise.all([
          PurchaseManager.checkEntitlement('premium'),
          PurchaseManager.getOfferings(),
        ]);
        setIsPremium(premium);
        setOfferings(offs);
      } catch {
        // Defaults: isPremium = false, offerings = []
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const purchasePackage = useCallback(async (packageId: string): Promise<PurchaseResult> => {
    const result = await PurchaseManager.purchasePackage(packageId);
    setIsPremium(result.isPremium);
    if (result.isPremium) {
      // Find the purchased package in offerings to set currentPlan
      setOfferings((prev) => {
        for (const offering of prev) {
          const pkg = offering.packages.find((p) => p.id === packageId);
          if (pkg) { setCurrentPlan(pkg); break; }
        }
        return prev;
      });
    }
    return result;
  }, []);

  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    const result = await PurchaseManager.restorePurchases();
    setIsPremium(result.isPremium);
    return result;
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoaded: !loading,
        loading,
        currentPlan,
        offerings,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
