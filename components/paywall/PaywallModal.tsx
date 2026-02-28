import { useState } from 'react';
import {
  Modal,
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

const FEATURES = [
  'Premium sounds',
  'Custom timer durations',
  'Stats history',
  'Quick Mixes',
  'No ads',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: Props) {
  const { offerings, purchasePackage, restorePurchases } = usePremium();
  const [busy, setBusy] = useState(false);

  const packages = offerings[0]?.packages ?? [];

  const handlePurchase = async (packageId: string) => {
    setBusy(true);
    try {
      const result = await purchasePackage(packageId);
      if (result.isPremium) {
        onClose();
      }
    } catch (err: any) {
      // Silently swallow user-cancelled purchases
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeBtnText}>×</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>Unlock everything in FocusBlock</Text>

          {/* Feature list */}
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Package cards */}
          {packages.length === 0 ? (
            <View style={styles.noPlansCard}>
              <Text style={styles.noPlansText}>No plans available — try again later</Text>
            </View>
          ) : (
            <View style={styles.packageRow}>
              {packages.map((pkg) => {
                const isAnnual = pkg.packageType === 'annual' || pkg.id === '$annual';
                return (
                  <View key={pkg.id} style={[styles.packageCard, isAnnual && styles.packageCardFeatured]}>
                    {isAnnual && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>Best Value</Text>
                      </View>
                    )}
                    <Text style={styles.packageName}>{pkg.product.title}</Text>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                    <Pressable
                      style={[styles.subscribeBtn, isAnnual && styles.subscribeBtnFeatured, busy && styles.btnDisabled]}
                      onPress={() => handlePurchase(pkg.id)}
                      disabled={busy}
                    >
                      <Text style={[styles.subscribeBtnText, isAnnual && styles.subscribeBtnTextFeatured]}>
                        Subscribe
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Restore link */}
          <Pressable style={styles.restoreRow} onPress={handleRestore} disabled={busy}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </Pressable>
        </ScrollView>

        {/* Busy overlay */}
        {busy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgMid,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 28,
    color: COLORS.textMuted,
    lineHeight: 32,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },

  // Feature list
  featureList: {
    width: '100%',
    gap: 14,
    marginBottom: 36,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },

  // Package cards
  packageRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardFeatured: {
    borderColor: 'rgba(232,168,124,0.4)',
    backgroundColor: 'rgba(232,168,124,0.06)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.bgDark,
    letterSpacing: 0.3,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subscribeBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
  },
  subscribeBtnFeatured: {
    backgroundColor: COLORS.accent,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subscribeBtnTextFeatured: {
    color: COLORS.bgDark,
  },

  // Restore
  restoreRow: {
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 13,
    color: COLORS.textDim,
    textDecorationLine: 'underline',
  },

  // No plans
  noPlansCard: {
    width: '100%',
    padding: 20,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    marginBottom: 24,
  },
  noPlansText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Busy overlay
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
