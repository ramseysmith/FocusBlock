export type PackageType = 'monthly' | 'annual' | 'lifetime' | 'custom';

export interface PurchaseProduct {
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode: string;
}

export interface PurchasePackage {
  id: string;
  packageType: PackageType;
  product: PurchaseProduct;
}

export interface Offering {
  identifier: string;
  serverDescription: string;
  packages: PurchasePackage[];
}

export interface EntitlementInfo {
  isActive: boolean;
  identifier: string;
  expirationDate: string | null;
  productIdentifier: string;
}

export interface CustomerInfo {
  activeSubscriptions: string[];
  entitlements: Record<string, EntitlementInfo>;
}

export interface PurchaseResult {
  customerInfo: CustomerInfo;
  isPremium: boolean;
}

export interface PurchaseConfig {
  provider: 'revenuecat' | 'mock';
  revenueCatApiKeyIos: string;
  revenueCatApiKeyAndroid: string;
  entitlementId: string;
}

export interface PurchaseService {
  initialize(config: PurchaseConfig): Promise<boolean>;
  getOfferings(): Promise<Offering[]>;
  purchasePackage(packageId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
  checkEntitlement(entitlementId: string): Promise<boolean>;
}
