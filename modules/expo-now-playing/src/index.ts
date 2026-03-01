import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import { Platform } from 'react-native';

function getModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule('ExpoNowPlaying');
  } catch {
    return null;
  }
}

let emitter: EventEmitter | null = null;
function getEmitter(): EventEmitter | null {
  const mod = getModule();
  if (!mod || !emitter) {
    try {
      emitter = mod ? new EventEmitter(mod) : null;
    } catch {
      return null;
    }
  }
  return emitter;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NowPlayingInfo {
  title?: string;
  artist?: string;
  /** Total duration of current session in seconds. */
  duration?: number;
  /** Elapsed time in seconds (time since session started). */
  elapsed?: number;
  /** Playback rate: 1.0 = playing, 0.0 = paused. */
  rate?: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Configure AVAudioSession for background playback.
 * Call this once when the user starts a focus session with sounds.
 */
export function activateAudioSession(): void {
  getModule()?.activateAudioSession();
}

export function deactivateAudioSession(): void {
  getModule()?.deactivateAudioSession();
}

/** Set the Now Playing metadata visible on the lock screen and Control Centre. */
export function updateNowPlaying(info: NowPlayingInfo): void {
  getModule()?.updateNowPlaying(info);
}

/** Remove the Now Playing card from lock screen / Control Centre. */
export function clearNowPlaying(): void {
  getModule()?.clearNowPlaying();
}

/**
 * Register MPRemoteCommandCenter handlers for Play and Pause.
 * The supplied callbacks fire when the user taps controls on the lock screen,
 * Control Centre, AirPods, or Bluetooth accessories.
 */
export function enableRemoteControls(handlers: {
  onPlay: () => void;
  onPause: () => void;
}): () => void {
  getModule()?.enableRemoteControls();
  const em = getEmitter();
  if (!em) return () => {};
  const playSub  = em.addListener('onPlay',  handlers.onPlay);
  const pauseSub = em.addListener('onPause', handlers.onPause);
  return () => {
    playSub.remove();
    pauseSub.remove();
  };
}

export function disableRemoteControls(): void {
  getModule()?.disableRemoteControls();
}
