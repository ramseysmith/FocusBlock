import Constants from 'expo-constants';
import type { PurchaseService, PurchaseConfig, Offering, PurchaseResult } from './types';

const LOG = '[PurchaseManager]';

function readConfig(): PurchaseConfig {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    provider: (extra.purchaseProvider as PurchaseConfig['provider']) ?? 'mock',
    revenueCatApiKeyIos:        extra.revenueCatIosKey        ?? '',
    revenueCatApiKeyAndroid:    extra.revenueCatAndroidKey    ?? '',
    entitlementId:              extra.revenueCatEntitlementId ?? 'premium',
  };
}

async function createAdapter(provider: PurchaseConfig['provider']): Promise<PurchaseService> {
  if (provider === 'revenuecat') {
    const { RevenueCatAdapter } = await import('./adapters/RevenueCatAdapter');
    return new RevenueCatAdapter();
  }
  const { MockPurchaseAdapter } = await import('./adapters/MockPurchaseAdapter');
  return new MockPurchaseAdapter();
}

async function createMock(): Promise<PurchaseService> {
  const { MockPurchaseAdapter } = await import('./adapters/MockPurchaseAdapter');
  return new MockPurchaseAdapter();
}

class PurchaseManagerClass {
  private adapter: PurchaseService | null = null;
  private initPromise: Promise<void> | null = null;

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
        throw new Error('Adapter returned false from initialize()');
      } catch (err) {
        console.warn(LOG, 'Initialization failed, falling back to mock:', err);
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

  private async ensure(): Promise<PurchaseService> {
    if (!this.adapter) await this.initialize();
    if (!this.adapter) throw new Error('PurchaseManager: no adapter available');
    return this.adapter;
  }

  async getOfferings(): Promise<Offering[]> {
    const adapter = await this.ensure();
    return adapter.getOfferings();
  }

  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    const adapter = await this.ensure();
    return adapter.purchasePackage(packageId);
  }

  async restorePurchases(): Promise<PurchaseResult> {
    const adapter = await this.ensure();
    return adapter.restorePurchases();
  }

  async checkEntitlement(entitlementId: string): Promise<boolean> {
    const adapter = await this.ensure();
    return adapter.checkEntitlement(entitlementId);
  }
}

export const PurchaseManager = new PurchaseManagerClass();
