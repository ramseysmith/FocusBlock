import { useEffect, useRef } from 'react';
import { AdManager } from '../../src/services/ads/AdManager';

interface InterstitialTriggerProps {
  /**
   * Increment this value to trigger an interstitial show.
   * The component shows an ad whenever `trigger` changes to a truthy value.
   */
  trigger: number;
  placement?: string;
  onShown?: () => void;
  onDismissed?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Headless component: renders nothing but watches `trigger`.
 * Place it at the top of a screen and increment `trigger` whenever you want
 * to attempt showing an interstitial (e.g. between Pomodoro sessions).
 *
 * Usage:
 *   const [adTrigger, setAdTrigger] = useState(0);
 *   ...
 *   <InterstitialTrigger trigger={adTrigger} onDismissed={() => startNextSession()} />
 *   <Button onPress={() => setAdTrigger(t => t + 1)} title="Next session" />
 */
export function InterstitialTrigger({
  trigger,
  placement = 'interstitial_default',
  onShown,
  onDismissed,
  onError,
}: InterstitialTriggerProps) {
  const mountedRef = useRef(true);

  // Keep callback refs up-to-date on every render so the trigger effect always
  // calls the latest prop versions without needing them in its dep array.
  const onShownRef    = useRef(onShown);
  const onDismissedRef = useRef(onDismissed);
  const onErrorRef    = useRef(onError);
  const placementRef  = useRef(placement);
  onShownRef.current    = onShown;
  onDismissedRef.current = onDismissed;
  onErrorRef.current    = onError;
  placementRef.current  = placement;

  useEffect(() => {
    // Preload on mount so an ad is ready when first needed
    AdManager.preload('interstitial').catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!trigger) return;

    AdManager.showInterstitial()
      .then(() => {
        if (!mountedRef.current) return;
        onShownRef.current?.();
        onDismissedRef.current?.();
        // Preload next
        AdManager.preload('interstitial').catch(() => {});
      })
      .catch((err: Error) => {
        if (!mountedRef.current) return;
        onErrorRef.current?.(err);
      });
  }, [trigger]);

  return null;
}
