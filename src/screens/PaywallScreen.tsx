import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { usePremium } from '../../context/PremiumContext';
import type { PurchasePackage } from '../services/purchases/types';

// ── Feature comparison data ────────────────────────────────────────────────────

type TierValue = boolean | string;

interface Feature {
  icon: string;
  label: string;
  free: TierValue;
  pro: TierValue;
}

const FEATURES: Feature[] = [
  { icon: '🔊', label: 'Ambient sounds',    free: '3 sounds',   pro: '6 sounds'   },
  { icon: '⏱',  label: 'Timer presets',     free: true,         pro: true         },
  { icon: '✏️', label: 'Custom durations',  free: false,        pro: true         },
  { icon: '🎛',  label: 'Quick Mixes',       free: false,        pro: true         },
  { icon: '📊', label: 'Stats history',      free: 'This week',  pro: 'All time'   },
  { icon: '🚫', label: 'No ads',             free: false,        pro: true         },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAnnualPackage(pkg: PurchasePackage) {
  return pkg.packageType === 'annual' || pkg.id === '$annual';
}

/** "$X.XX/mo billed annually" string for annual packages. */
function monthlyEquivLabel(pkg: PurchasePackage): string | null {
  if (!isAnnualPackage(pkg) || pkg.product.price <= 0) return null;
  const equiv = (pkg.product.price / 12).toFixed(2);
  return `$${equiv}/mo · billed annually`;
}

/** "Save XX%" relative to monthly plan × 12. Returns null if monthly not found. */
function savingsLabel(pkg: PurchasePackage, packages: PurchasePackage[]): string | null {
  if (!isAnnualPackage(pkg)) return null;
  const monthly = packages.find((p) => p.packageType === 'monthly' || p.id === '$monthly');
  if (!monthly || monthly.product.price <= 0) return null;
  const full = monthly.product.price * 12;
  const pct = Math.round(((full - pkg.product.price) / full) * 100);
  return pct > 0 ? `Save ${pct}%` : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TierCell({ value, isPro }: { value: TierValue; isPro: boolean }) {
  if (typeof value === 'string') {
    return (
      <Text style={[styles.tierStr, isPro && styles.tierStrPro]}>{value}</Text>
    );
  }
  if (value) {
    return <Text style={[styles.check, isPro && styles.checkPro]}>✓</Text>;
  }
  return <Text style={styles.dash}>—</Text>;
}

function FeatureRow({ feature, isLast }: { feature: Feature; isLast: boolean }) {
  return (
    <View style={[styles.featureRow, !isLast && styles.featureRowBorder]}>
      <View style={styles.featureLeft}>
        <Text style={styles.featureIcon}>{feature.icon}</Text>
        <Text style={styles.featureLabel}>{feature.label}</Text>
      </View>
      <View style={styles.tierCell}>
        <TierCell value={feature.free} isPro={false} />
      </View>
      <View style={styles.tierCell}>
        <TierCell value={feature.pro} isPro={true} />
      </View>
    </View>
  );
}

function PricingCard({
  pkg,
  packages,
  isSelected,
  onSelect,
}: {
  pkg: PurchasePackage;
  packages: PurchasePackage[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const annual = isAnnualPackage(pkg);
  const equivLabel = monthlyEquivLabel(pkg);
  const savings = savingsLabel(pkg, packages);

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.pricingCard,
        isSelected && styles.pricingCardSelected,
        annual && styles.pricingCardAnnual,
        annual && isSelected && styles.pricingCardAnnualSelected,
      ]}
    >
      {/* Radio */}
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>

      {/* Text block */}
      <View style={styles.pricingText}>
        <View style={styles.pricingNameRow}>
          <Text style={[styles.pricingName, isSelected && styles.pricingNameSelected]}>
            {pkg.product.title}
          </Text>
          {savings && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>{savings}</Text>
            </View>
          )}
        </View>
        {equivLabel && (
          <Text style={styles.pricingEquiv}>{equivLabel}</Text>
        )}
      </View>

      {/* Price */}
      <Text style={[styles.pricingPrice, annual && isSelected && styles.pricingPriceAccent]}>
        {pkg.product.priceString}
      </Text>
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function PaywallScreen({ onClose }: Props) {
  const { offerings, purchasePackage, restorePurchases } = usePremium();
  const [busy, setBusy] = useState(false);

  const packages = offerings[0]?.packages ?? [];

  // Pre-select annual if available, else first package
  const defaultPkg =
    packages.find((p) => isAnnualPackage(p))?.id ?? packages[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(defaultPkg);

  // If offerings arrive after the modal opens (slow network), pick a default
  useEffect(() => {
    if (selectedId === '' && packages.length > 0) {
      setSelectedId(defaultPkg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length]);

  const handlePurchase = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await purchasePackage(selectedId);
      if (result.isPremium) onClose();
    } catch (err: any) {
      const code: string = err?.code ?? err?.userInfo?.code ?? '';
      if (code === 'PURCHASE_CANCELLED' || code === '1') return;
      Alert.alert('Purchase failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        onClose();
      } else {
        Alert.alert('No purchases found', 'No active subscription was found for your account.');
      }
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Could not restore purchases.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={16} disabled={busy}>
        <View style={styles.closeBtnInner}>
          <Text style={styles.closeBtnText}>×</Text>
        </View>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
          <Text style={styles.title}>Unlock FocusBlock Pro</Text>
          <Text style={styles.subtitle}>
            Everything you need for deep, distraction-free work
          </Text>
        </View>

        {/* ── Feature comparison ──────────────────────────────────────────────── */}
        <View style={styles.comparisonCard}>
          {/* Column headers */}
          <View style={styles.comparisonHeader}>
            <View style={styles.featureLeft} />
            <View style={styles.tierCell}>
              <Text style={styles.tierHeaderFree}>Free</Text>
            </View>
            <View style={styles.tierCell}>
              <Text style={styles.tierHeaderPro}>Pro</Text>
            </View>
          </View>

          <View style={styles.headerDivider} />

          {FEATURES.map((f, i) => (
            <FeatureRow key={f.label} feature={f} isLast={i === FEATURES.length - 1} />
          ))}
        </View>

        {/* ── Pricing cards ───────────────────────────────────────────────────── */}
        {packages.length === 0 ? (
          <View style={styles.noPlanCard}>
            <Text style={styles.noPlanText}>No plans available — try again later</Text>
          </View>
        ) : (
          <View style={styles.pricingSection}>
            {packages.map((pkg) => (
              <PricingCard
                key={pkg.id}
                pkg={pkg}
                packages={packages}
                isSelected={selectedId === pkg.id}
                onSelect={() => setSelectedId(pkg.id)}
              />
            ))}
          </View>
        )}

        {/* ── Subscribe CTA ───────────────────────────────────────────────────── */}
        {packages.length > 0 && (
          <Pressable
            style={[styles.subscribeBtn, busy && styles.subscribeBtnDisabled]}
            onPress={handlePurchase}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.bgDark} />
            ) : (
              <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
            )}
          </Pressable>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerLegal}>
            Cancel anytime. Subscription renews automatically.
          </Text>
          <Pressable onPress={handleRestore} disabled={busy} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Busy overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const TIER_COL_W = 62;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgMid,
  },

  // ── Close button
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 22,
    color: COLORS.textMuted,
    lineHeight: 28,
    marginTop: -2,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 32,
  },

  // ── Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  proPill: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  proPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.bgDark,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  // ── Feature comparison
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 20,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
  },
  tierHeaderFree: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tierHeaderPro: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  featureLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 17,
    width: 24,
    textAlign: 'center',
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '400',
    flex: 1,
  },
  tierCell: {
    width: TIER_COL_W,
    alignItems: 'center',
  },
  tierStr: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  tierStrPro: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  check: {
    fontSize: 14,
    color: COLORS.textDim,
    fontWeight: '600',
  },
  checkPro: {
    color: COLORS.accent,
  },
  dash: {
    fontSize: 14,
    color: COLORS.textDim,
  },

  // ── Pricing
  pricingSection: {
    gap: 10,
    marginBottom: 20,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pricingCardSelected: {
    borderColor: 'rgba(232,168,124,0.4)',
    backgroundColor: 'rgba(232,168,124,0.04)',
  },
  pricingCardAnnual: {
    // Annual gets slightly warmer border even unselected
    borderColor: 'rgba(232,168,124,0.18)',
  },
  pricingCardAnnualSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(232,168,124,0.08)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  pricingText: {
    flex: 1,
  },
  pricingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pricingNameSelected: {
    color: COLORS.textPrimary,
  },
  savingsBadge: {
    backgroundColor: 'rgba(232,168,124,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.2,
  },
  pricingEquiv: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  pricingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  pricingPriceAccent: {
    color: COLORS.accent,
  },

  // ── No plan fallback
  noPlanCard: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    marginBottom: 20,
  },
  noPlanText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Subscribe CTA
  subscribeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  subscribeBtnDisabled: {
    opacity: 0.6,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bgDark,
    letterSpacing: 0.2,
  },

  // ── Footer
  footer: {
    alignItems: 'center',
    gap: 14,
  },
  footerLegal: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 16,
  },
  restoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  restoreText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },

  // ── Busy overlay
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
