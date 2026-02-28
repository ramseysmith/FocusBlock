import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@focusblock/is_premium';

interface PremiumContextValue {
  isPremium: boolean;
  isLoaded: boolean;
  setPremium: (v: boolean) => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoaded: false,
  setPremium: async () => {},
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY)
      .then((val) => {
        if (val === 'true') setIsPremium(true);
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setPremium = async (v: boolean) => {
    setIsPremium(v);
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, v ? 'true' : 'false');
    } catch {}
  };

  return (
    <PremiumContext.Provider value={{ isPremium, isLoaded, setPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
