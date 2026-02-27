export const TIMER_MODES = [
  { id: 'focus',  label: 'Focus',       duration: 25 * 60, color: '#E8A87C' },
  { id: 'short',  label: 'Short Break', duration: 5 * 60,  color: '#85CDCA' },
  { id: 'long',   label: 'Long Break',  duration: 15 * 60, color: '#D4A5E5' },
] as const;

export type TimerMode = (typeof TIMER_MODES)[number];

export const AMBIENT_SOUNDS = [
  { id: 'rain',   label: 'Rain',      emoji: '🌧️' },
  { id: 'forest', label: 'Forest',    emoji: '🌿' },
  { id: 'ocean',  label: 'Ocean',     emoji: '🌊' },
  { id: 'fire',   label: 'Fireplace', emoji: '🔥' },
  { id: 'cafe',   label: 'Café',      emoji: '☕' },
  { id: 'wind',   label: 'Wind',      emoji: '💨' },
] as const;

export type AmbientSound = (typeof AMBIENT_SOUNDS)[number];

export const QUICK_MIXES = [
  { label: '☕ Coffee Shop', sounds: ['cafe', 'rain'] },
  { label: '🏕️ Campsite',   sounds: ['fire', 'forest', 'wind'] },
  { label: '🏖️ Beach Cabin', sounds: ['ocean', 'rain'] },
] as const;

export const QUOTES = [
  'Deep work is the ability to focus without distraction on a cognitively demanding task.',
  'Where focus goes, energy flows.',
  'The successful warrior is the average person, with laser focus.',
  'Concentrate all your thoughts upon the work at hand.',
  'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.',
  'It is during our darkest moments that we must focus to see the light.',
] as const;
