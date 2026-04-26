// --- Primitive palette ---

type Theme = 'light' | 'dark';
type ColorNames = typeof shared & { background: string, surface: string, cardElevated: string, textHeadline: string, text: string, textMuted: string, textSubtle: string, textPlaceholder: string, borderDivider: string, borderCard: string, borderStrong: string, icon: string };

export const Neutral = {
  1: '#ffffff',
  2: '#fcfcfc',
  3: '#f5f5f5',
  4: '#f0f0f0',
  5: '#d9d9d9',
  6: '#bfbfbf',
  7: '#8c8c8c',
  8: '#595959',
  9: '#454545',
  10: '#262626',
  11: '#1f1f1f',
  12: '#141414',
  13: '#000000',
} as const;

export const Electric = {
  50: '#ecf3fc',
  100: '#c3ddf6',
  200: '#a5c6fc',
  300: '#7cb2f9',
  400: '#6399f6',
  500: '#3b82f6',
  600: '#3775e0',
  700: '#2b5cbe',
  800: '#214887',
  900: '#19377c',
} as const;

export const Cyan = {
  50: '#e8f6f6',
  100: '#b5e3e0',
  200: '#93ded6',
  300: '#82cfc3',
  400: '#74c6b8',
  500: '#14b8a6',
  600: '#13a797',
  700: '#0f8376',
  800: '#0c655d',
  900: '#094c46',
} as const;


// Mid-point between Cyan[500] and Electric[500] gradient
export const GradientMid = '#3D9ECB';

// --- Shared semantic tokens ---

const shared = {
  // Primary (Electric)
  primary: Electric[500],
  primaryHover: Electric[400],
  primaryPressed: Electric[600],
  primarySubtle: 'rgba(59, 130, 246, 0.15)',

  // Secondary (Cyan)
  secondary: Cyan[500],
  secondaryHover: Cyan[400],
  secondaryPressed: Cyan[600],
  secondarySubtle: 'rgba(20, 184, 166, 0.15)',

  // States
  success: Cyan[500],
  successSubtle: 'rgba(20, 184, 166, 0.15)',

  // Misc
  overlay: 'rgba(0,0,0,0.5)',
} as const;


// --- Semantic tokens (light & dark) ---

export const Colors: Record<Theme, ColorNames> = {
  light: {
    ...shared,

    // Backgrounds
    background: Neutral[1],
    surface: Neutral[2],
    cardElevated: Neutral[1],

    // Text
    textHeadline: Neutral[13],
    text: Neutral[11],
    textMuted: Neutral[8],
    textSubtle: Neutral[7],
    textPlaceholder: Neutral[5],

    // Borders
    borderDivider: Neutral[4],
    borderCard: Neutral[3],
    borderStrong: Neutral[6],

    // Icons
    icon: Neutral[8],
  },

  dark: {
    ...shared,

    // Backgrounds
    background: Neutral[13],
    surface: Neutral[12],
    cardElevated: Neutral[11],

    // Text
    textHeadline: Neutral[1],
    text: Neutral[1],
    textMuted: Neutral[6],
    textSubtle: Neutral[7],
    textPlaceholder: Neutral[8],

    // Borders
    borderDivider: Neutral[10],
    borderCard: Neutral[11],
    borderStrong: Neutral[8],

    // Icons
    icon: Neutral[6],
  },
} as const;


// --- Fonts ---

export const Fonts = {
  satoshiRegular: 'Satoshi-Regular',
  satoshiMedium: 'Satoshi-Medium',
  satoshiBold: 'Satoshi-Bold',
  satoshiBlack: 'Satoshi-Black',
} as const;