// One design system: Cadence Kit colors on the Dot Board grid. Every glyph, icon and rule is lit dots.
// Colors come from cadence-kit dist/json/cadence-web-{dark,light}.json (alias layer).

export type ThemeName = 'dark' | 'light';
export interface Theme { bg: string; unlit: string; dim: string; grey: string; ink: string; signal: string }

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    bg: '#0b0c0c',     // alias.color.background.body
    unlit: '#161918',  // alias.color.background.highEmphasis
    dim: '#30353a',    // quiet ink for the progress bar and rules
    grey: '#9da3a1',   // alias.color.text.subtle
    ink: '#f7f8f8',    // alias.color.text.default
    signal: '#ff5a60', // alias.color.border.focusOutline (Cadence red, dark)
  },
  light: {
    bg: '#f7f8f8',
    unlit: '#e1e4e3',
    dim: '#c3c8c6',
    grey: '#5a605e',
    ink: '#0b0c0c',
    signal: '#d71921',
  },
};

/**
 * Type roles. Every role lights board dots.
 * - doto: the Doto font sampled on its own 5 x 7 dot grid (plus 2 descender rows); each Doto dot
 *   becomes a scale x scale block of board dots, so a hero letter is the same filled-dot block as the cursor.
 * - mini: a 3 x 5 dot face for labels, captions and chrome.
 * lead = rows from one line to the next.
 */
export interface TypeRole { face: 'doto' | 'mini'; scale: number; upper: boolean; cycles: boolean; lead: number }

export const TYPE = {
  hero: { face: 'doto', scale: 3, upper: true, cycles: true, lead: 30 },   // cap 21 rows, 18 cells per char
  h1: { face: 'doto', scale: 2, upper: true, cycles: true, lead: 20 },     // cap 14 rows, 12 cells per char
  body: { face: 'doto', scale: 1, upper: false, cycles: false, lead: 10 }, // cap 7 rows, 6 cells per char
  label: { face: 'mini', scale: 1, upper: true, cycles: false, lead: 8 },  // cap 5 rows, 4 cells per char
} satisfies Record<string, TypeRole>;

export type Role = keyof typeof TYPE;
