import type { AdService, AdProviderConfig, AdType, BannerAdSize, RewardItem } from '../types';
import type { ReactElement } from 'react';

const LOG = '[MediatedAdAdapter]';

/** Per-hop timeout for interstitial / rewarded waterfall attempts. */
const WATERFALL_TIMEOUT_MS = 5_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Races `promise` against a rejection timer.
 * Throws with a descriptive message if `ms` elapses first.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`Ad timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timerId)),
    timeout,
  ]);
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * A meta-adapter that implements a simple ordered waterfall.
 *
 * - Banners   → primary adapter only (index 0).
 * - Interstitial / Rewarded → try each adapter in order; move to the next if
 *   the current one throws or times out after WATERFALL_TIMEOUT_MS.
 *
 * Adding a new network in future:
 *   new MediatedAdAdapter([admob, unity, appLovin, ironSource])
 * No UI code or AdManager logic needs to change.
 */
export class MediatedAdAdapter implements AdService {
  /** Ordered list of adapters. Index 0 is always the primary network. */
  private readonly adapters: AdService[];

  constructor(adapters: AdService[]) {
    if (adapters.length === 0) {
      throw new Error('MediatedAdAdapter requires at least one adapter');
    }
    this.adapters = adapters;
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Initializes all adapters concurrently.
   * Requires only the **primary** adapter to succeed — secondary failures are
   * logged as warnings but do not prevent the mediation layer from being ready.
   */
  async initialize(config: AdProviderConfig): Promise<boolean> {
    const results = await Promise.allSettled(
      this.adapters.map((adapter, i) =>
        adapter.initialize(config).then((ok) => {
          if (ok) {
            console.log(LOG, `adapter[${i}] initialized`);
          } else {
            console.warn(LOG, `adapter[${i}] initialize() returned false`);
          }
          return ok;
        })
      )
    );

    // Log failures for non-primary adapters (non-fatal).
    results.slice(1).forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(LOG, `adapter[${i + 1}] initialize() threw:`, r.reason);
      }
    });

    // Primary must succeed.
    const primary = results[0];
    if (primary.status === 'rejected') {
      console.error(LOG, 'Primary adapter initialize() threw:', primary.reason);
      return false;
    }
    return primary.value === true;
  }

  // ── Banner — primary adapter only ─────────────────────────────────────────
  // Banners are inline components; the primary network's view is always used.
  // There is no per-impression fallback for banners (they self-refresh via SDK).

  renderBannerView(
    placement: string,
    size: BannerAdSize,
    options?: { onAdLoaded?: () => void; onAdFailedToLoad?: (error: Error) => void }
  ): ReactElement | null {
    return this.adapters[0].renderBannerView(placement, size, options);
  }

  showBanner(placement: string): void {
    this.adapters[0].showBanner(placement);
  }

  hideBanner(placement: string): void {
    this.adapters[0].hideBanner(placement);
  }

  // ── Interstitial — waterfall ──────────────────────────────────────────────

  async showInterstitial(): Promise<void> {
    let lastError: Error = new Error('No adapters in waterfall');

    for (let i = 0; i < this.adapters.length; i++) {
      try {
        await withTimeout(this.adapters[i].showInterstitial(), WATERFALL_TIMEOUT_MS);
        console.log(LOG, `showInterstitial() filled by adapter[${i}]`);
        return;
      } catch (err) {
        lastError = err as Error;
        console.warn(LOG, `showInterstitial() adapter[${i}] failed, falling through:`, lastError.message);
      }
    }

    throw lastError;
  }

  // ── Rewarded — waterfall ──────────────────────────────────────────────────

  async showRewarded(onReward: (reward: RewardItem) => void): Promise<void> {
    let lastError: Error = new Error('No adapters in waterfall');

    for (let i = 0; i < this.adapters.length; i++) {
      try {
        await withTimeout(this.adapters[i].showRewarded(onReward), WATERFALL_TIMEOUT_MS);
        console.log(LOG, `showRewarded() filled by adapter[${i}]`);
        return;
      } catch (err) {
        lastError = err as Error;
        console.warn(LOG, `showRewarded() adapter[${i}] failed, falling through:`, lastError.message);
      }
    }

    throw lastError;
  }

  // ── Readiness ─────────────────────────────────────────────────────────────

  isReady(adType: AdType): boolean {
    if (adType === 'banner') {
      // Banners only come from the primary adapter.
      return this.adapters[0].isReady('banner');
    }
    // Interstitial / rewarded: ready if ANY adapter in the waterfall can serve.
    return this.adapters.some((a) => a.isReady(adType));
  }

  // ── Preload — all adapters concurrently ───────────────────────────────────
  // Pre-fill every adapter so the waterfall never hits an unloaded slot.

  async preload(adType: Extract<AdType, 'interstitial' | 'rewarded'>): Promise<void> {
    await Promise.allSettled(this.adapters.map((a) => a.preload(adType)));
  }
}
