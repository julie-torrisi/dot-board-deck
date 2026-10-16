// One design system: Cadence Kit tokens (color, type families) on the Dot Board grid.
// Colors come from cadence-kit dist/json/cadence-web-{dark,light}.json (alias layer).

export type ThemeName = 'dark' | 'light';
export interface Theme { bg: string; unlit: string; grey: string; ink: string; signal: string }

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    bg: '#0b0c0c',     // alias.color.background.body
    unlit: '#161918',  // alias.color.background.highEmphasis
    grey: '#9da3a1',   // alias.color.text.subtle
    ink: '#f7f8f8',    // alias.color.text.default
    signal: '#ff5a60', // alias.color.border.focusOutline (Cadence red, dark)
  },
  light: {
    bg: '#f7f8f8',     // alias.color.background.highEmphasis
    unlit: '#e1e4e3',  // alias.color.background.body
    grey: '#5a605e',   // alias.color.text.subtle
    ink: '#0b0c0c',    // alias.color.text.default
    signal: '#d71921', // alias.color.border.focusOutline (Cadence red, light)
  },
};

/** Type roles. Sizes are in grid cells (1 cell = 5px on a 1920 x 1080 slide). */
export interface TypeRole { family: 'Doto' | 'Inter'; weight: number; size: number; tracking: number; upper: boolean; mono: boolean }

export const TYPE = {
  // Doto Bold is monospaced at 0.6em, so 150px and 100px land exactly on 18 and 12 cell advances.
  hero: { family: 'Doto', weight: 700, size: 30, tracking: 0, upper: true, mono: true },   // 150px, cap 21 rows
  h1: { family: 'Doto', weight: 700, size: 20, tracking: 0, upper: true, mono: true },     // 100px, cap 14 rows
  body: { family: 'Inter', weight: 400, size: 9.6, tracking: 0, upper: false, mono: false }, // 48px, cap 7 rows
  label: { family: 'Inter', weight: 500, size: 5.6, tracking: 0.08, upper: true, mono: false }, // 28px caps, tracked
} satisfies Record<string, TypeRole>;

export type Role = keyof typeof TYPE;
