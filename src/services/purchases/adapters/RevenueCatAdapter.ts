import { Platform } from 'react-native';
import type {
  PurchaseService,
  PurchaseConfig,
  Offering,
  PurchasePackage,
  PurchaseResult,
  CustomerInfo,
  EntitlementInfo,
} from '../types';

const LOG = '[RevenueCatAdapter]';

export class RevenueCatAdapter implements PurchaseService {
  private entitlementId = 'premium';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get Purchases(): any {
    // Lazy require — throws in Expo Go; caught by PurchaseManager fallback
    return require('react-native-purchases').default;
  }

  async initialize(config: PurchaseConfig): Promise<boolean> {
    console.log(LOG, 'initialize()');
    this.entitlementId = config.entitlementId;
    const apiKey =
      Platform.OS === 'ios' ? config.revenueCatApiKeyIos : config.revenueCatApiKeyAndroid;
    if (!apiKey) {
      console.warn(LOG, 'No API key provided for platform', Platform.OS);
      return false;
    }
    this.Purchases.configure({ apiKey });
    return true;
  }

  async getOfferings(): Promise<Offering[]> {
    console.log(LOG, 'getOfferings()');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offeringsResult = await this.Purchases.getOfferings() as any;
    const all = offeringsResult?.all ?? {};
    return Object.values(all).map((o: any) => this.mapOffering(o));
  }

  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    console.log(LOG, `purchasePackage(${packageId})`);
    const offeringsResult = await this.Purchases.getOfferings() as any;
    const all = offeringsResult?.all ?? {};
    let pkg: any = null;
    for (const offering of Object.values(all) as any[]) {
      const found = offering.availablePackages?.find((p: any) => p.identifier === packageId);
      if (found) { pkg = found; break; }
    }
    if (!pkg) throw new Error(`Package '${packageId}' not found`);
    const { customerInfo } = await this.Purchases.purchasePackage(pkg);
    return this.mapCustomerInfo(customerInfo, this.entitlementId);
  }

  async restorePurchases(): Promise<PurchaseResult> {
    console.log(LOG, 'restorePurchases()');
    const customerInfo = await this.Purchases.restorePurchases();
    return this.mapCustomerInfo(customerInfo, this.entitlementId);
  }

  async checkEntitlement(entitlementId: string): Promise<boolean> {
    console.log(LOG, `checkEntitlement(${entitlementId})`);
    const customerInfo = await this.Purchases.getCustomerInfo();
    return customerInfo?.entitlements?.active?.[entitlementId]?.isActive === true;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private mapOffering(o: any): Offering {
    return {
      identifier: o.identifier,
      serverDescription: o.serverDescription ?? '',
      packages: (o.availablePackages ?? []).map((p: any) => this.mapPackage(p)),
    };
  }

  private mapPackage(p: any): PurchasePackage {
    const product = p.product ?? {};
    return {
      id: p.identifier,
      packageType: (p.packageType?.toLowerCase() ?? 'custom') as PurchasePackage['packageType'],
      product: {
        title: product.title ?? product.localizedTitle ?? '',
        description: product.description ?? product.localizedDescription ?? '',
        priceString: product.priceString ?? product.localizedPrice ?? '',
        price: product.price ?? 0,
        currencyCode: product.currencyCode ?? 'USD',
      },
    };
  }

  private mapCustomerInfo(rcInfo: any, entitlementId: string): PurchaseResult {
    const activeEntitlements: Record<string, EntitlementInfo> = {};
    const active = rcInfo?.entitlements?.active ?? {};
    for (const [key, ent] of Object.entries(active) as [string, any][]) {
      activeEntitlements[key] = {
        isActive: ent.isActive,
        identifier: ent.identifier,
        expirationDate: ent.expirationDate ?? null,
        productIdentifier: ent.productIdentifier ?? '',
      };
    }
    const customerInfo: CustomerInfo = {
      activeSubscriptions: rcInfo?.activeSubscriptions ?? [],
      entitlements: activeEntitlements,
    };
    const isPremium = activeEntitlements[entitlementId]?.isActive === true;
    return { customerInfo, isPremium };
  }
}
