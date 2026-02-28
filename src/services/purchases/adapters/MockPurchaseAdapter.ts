import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PurchaseService,
  PurchaseConfig,
  Offering,
  PurchaseResult,
  CustomerInfo,
} from '../types';

const LOG = '[MockPurchaseAdapter]';
const MOCK_KEY = '@focusblock/mock_purchase';

interface MockState {
  isPremium: boolean;
  plan: string | null;
}

function emptyCustomerInfo(): CustomerInfo {
  return { activeSubscriptions: [], entitlements: {} };
}

function premiumCustomerInfo(plan: string): CustomerInfo {
  return {
    activeSubscriptions: [plan],
    entitlements: {
      premium: {
        isActive: true,
        identifier: 'premium',
        expirationDate: null,
        productIdentifier: plan,
      },
    },
  };
}

export class MockPurchaseAdapter implements PurchaseService {
  private state: MockState = { isPremium: false, plan: null };

  async initialize(_config: PurchaseConfig): Promise<boolean> {
    console.log(LOG, 'initialize()');
    try {
      const raw = await AsyncStorage.getItem(MOCK_KEY);
      if (raw) {
        this.state = JSON.parse(raw) as MockState;
      }
    } catch {}
    return true;
  }

  async getOfferings(): Promise<Offering[]> {
    console.log(LOG, 'getOfferings()');
    return [
      {
        identifier: 'default',
        serverDescription: 'FocusBlock Pro',
        packages: [
          {
            id: '$monthly',
            packageType: 'monthly',
            product: {
              title: 'Monthly',
              description: 'Full access, billed monthly',
              priceString: '$2.99/mo',
              price: 2.99,
              currencyCode: 'USD',
            },
          },
          {
            id: '$annual',
            packageType: 'annual',
            product: {
              title: 'Annual',
              description: 'Full access, billed yearly',
              priceString: '$19.99/yr',
              price: 19.99,
              currencyCode: 'USD',
            },
          },
        ],
      },
    ];
  }

  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    console.log(LOG, `purchasePackage(${packageId})`);
    this.state = { isPremium: true, plan: packageId };
    try {
      await AsyncStorage.setItem(MOCK_KEY, JSON.stringify(this.state));
    } catch {}
    return {
      customerInfo: premiumCustomerInfo(packageId),
      isPremium: true,
    };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    console.log(LOG, 'restorePurchases()');
    if (this.state.isPremium && this.state.plan) {
      return {
        customerInfo: premiumCustomerInfo(this.state.plan),
        isPremium: true,
      };
    }
    return {
      customerInfo: emptyCustomerInfo(),
      isPremium: false,
    };
  }

  async checkEntitlement(entitlementId: string): Promise<boolean> {
    console.log(LOG, `checkEntitlement(${entitlementId})`);
    return this.state.isPremium;
  }

  /** Dev helper — call from Settings to reset premium state. */
  static async resetPremium(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MOCK_KEY);
      console.log(LOG, 'Premium reset');
    } catch {}
  }
}
