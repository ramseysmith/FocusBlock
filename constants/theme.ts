export const COLORS = {
  // Backgrounds
  bgDark: '#0d0b11',
  bgMid: '#12101a',
  bgLight: '#1a1520',

  // Mode accent colors
  focus: '#E8A87C',       // Warm amber
  shortBreak: '#85CDCA',  // Teal
  longBreak: '#D4A5E5',   // Lavender

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  textDim: 'rgba(255,255,255,0.2)',
  textTiny: 'rgba(255,255,255,0.25)',

  // Surfaces
  surface: 'rgba(255,255,255,0.03)',
  surfaceBorder: 'rgba(255,255,255,0.05)',
  surfaceHighlight: 'rgba(255,255,255,0.08)',

  // Accent (same as focus, aliased for convenience)
  accent: '#E8A87C',
} as const;
