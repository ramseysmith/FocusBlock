import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Audio } from 'expo-av';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SoundId = 'rain' | 'forest' | 'ocean' | 'fire' | 'cafe' | 'wind';

export type SoundState = {
  isPlaying: boolean;
  volume: number; // 0–1
};

type AudioMixerContextValue = {
  soundStates: Record<SoundId, SoundState>;
  toggleSound: (id: SoundId) => Promise<void>;
  setVolume: (id: SoundId, volume: number) => Promise<void>;
  applyMix: (ids: readonly string[]) => Promise<void>;
  stopAll: () => Promise<void>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const SOUND_IDS: SoundId[] = ['rain', 'forest', 'ocean', 'fire', 'cafe', 'wind'];

/**
 * Static asset map — require() must be static (no dynamic keys).
 * Replace these WAV files with royalty-free loops from e.g. freesound.org.
 */
const SOUND_ASSETS: Record<SoundId, number> = {
  rain:   require('../assets/sounds/rain.wav'),
  forest: require('../assets/sounds/forest.wav'),
  ocean:  require('../assets/sounds/ocean.wav'),
  fire:   require('../assets/sounds/fire.wav'),
  cafe:   require('../assets/sounds/cafe.wav'),
  wind:   require('../assets/sounds/wind.wav'),
};

const DEFAULT_VOLUME = 0.7;

const initialStates = Object.fromEntries(
  SOUND_IDS.map((id) => [id, { isPlaying: false, volume: DEFAULT_VOLUME }])
) as Record<SoundId, SoundState>;

// ── Context ───────────────────────────────────────────────────────────────────

const AudioMixerContext = createContext<AudioMixerContextValue>({
  soundStates: initialStates,
  toggleSound: async () => {},
  setVolume: async () => {},
  applyMix: async () => {},
  stopAll: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function AudioMixerProvider({ children }: { children: React.ReactNode }) {
  // Live Sound instances — not state since mutations don't need re-renders
  const soundsRef = useRef<Partial<Record<SoundId, Audio.Sound>>>({});
  // Keep a ref in sync with state so stable callbacks can read current values
  const statesRef = useRef<Record<SoundId, SoundState>>(initialStates);
  const [soundStates, setSoundStates] = useState<Record<SoundId, SoundState>>(initialStates);

  statesRef.current = soundStates;

  // Configure the audio session once on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});

    return () => {
      // Unload all sounds when the provider unmounts
      Object.values(soundsRef.current).forEach((s) =>
        s?.unloadAsync().catch(() => {})
      );
    };
  }, []);

  // ── Helpers (stable, use refs) ─────────────────────────────────────────────

  const loadAndPlay = useCallback(async (id: SoundId, volume: number) => {
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[id], {
        isLooping: true,
        volume,
        shouldPlay: true,
      });
      soundsRef.current[id] = sound;
    } catch (err) {
      console.warn(`[AudioMixer] Could not load "${id}":`, err);
      // Roll back the playing flag if load fails
      setSoundStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], isPlaying: false },
      }));
    }
  }, []);

  const stopAndUnload = useCallback(async (id: SoundId) => {
    const sound = soundsRef.current[id];
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      // ignore — the sound may have already been released
    }
    delete soundsRef.current[id];
  }, []);

  // ── Public API (all stable — deps are refs/setters/helpers) ───────────────

  const toggleSound = useCallback(
    async (id: SoundId) => {
      const { isPlaying, volume } = statesRef.current[id];

      if (isPlaying) {
        setSoundStates((prev) => ({ ...prev, [id]: { ...prev[id], isPlaying: false } }));
        await stopAndUnload(id);
      } else {
        setSoundStates((prev) => ({ ...prev, [id]: { ...prev[id], isPlaying: true } }));
        await loadAndPlay(id, volume);
      }
    },
    [loadAndPlay, stopAndUnload]
  );

  const setVolume = useCallback(
    async (id: SoundId, volume: number) => {
      setSoundStates((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));
      try {
        await soundsRef.current[id]?.setVolumeAsync(volume);
      } catch {
        // ignore
      }
    },
    []
  );

  const applyMix = useCallback(
    async (ids: readonly string[]) => {
      const mixIds = ids as SoundId[];
      const current = statesRef.current;

      // Stop sounds not in the mix
      for (const id of SOUND_IDS) {
        if (!mixIds.includes(id) && current[id].isPlaying) {
          setSoundStates((prev) => ({ ...prev, [id]: { ...prev[id], isPlaying: false } }));
          await stopAndUnload(id);
        }
      }

      // Start sounds in the mix that aren't already playing
      for (const id of mixIds) {
        if (!current[id].isPlaying) {
          setSoundStates((prev) => ({ ...prev, [id]: { ...prev[id], isPlaying: true } }));
          await loadAndPlay(id, current[id].volume);
        }
      }
    },
    [loadAndPlay, stopAndUnload]
  );

  const stopAll = useCallback(async () => {
    for (const id of SOUND_IDS) {
      await stopAndUnload(id);
    }
    setSoundStates(
      Object.fromEntries(
        SOUND_IDS.map((id) => [id, { ...statesRef.current[id], isPlaying: false }])
      ) as Record<SoundId, SoundState>
    );
  }, [stopAndUnload]);

  return (
    <AudioMixerContext.Provider
      value={{ soundStates, toggleSound, setVolume, applyMix, stopAll }}
    >
      {children}
    </AudioMixerContext.Provider>
  );
}

export const useAudioMixer = () => useContext(AudioMixerContext);
