/**
 * Corvus Protocol — design tokens.
 * Exact hex values, type pairing, radii and glow rules taken from the design handoff
 * (docs/design/README.md · "Design Tokens" and the UI reference mockup).
 *
 * NOTE: keep this file free of `react-native` imports — the headless stress harness
 * imports the game engine, which transitively imports these tokens. Device/responsive
 * scaling (Dimensions) lives in scale.ts instead.
 */

export const colors = {
  // Background / neutrals
  voidBlack: '#05070a', // deepest device-frame black
  ink: '#0A0E12',
  navy: '#1A2332',
  panel: '#0c131d', // card gradient low
  panelHi: '#141d2b', // card gradient high
  surface: '#101a28', // buildable tile
  paper: '#F4F6F8', // primary text / light

  // Accents
  teal: '#00C2C7', // Corvus / primary CTA
  tealDeep: '#0D6E7A',
  tealSoft: '#8fd8da',
  gold: '#B8922A', // Resonance / Mira
  goldLight: '#E4C15A',
  purple: '#6B4FA0', // Sage / prestige
  purpleLight: '#b39be0',
  purpleSoft: '#c3b2e6',
  green: '#3ecf6e', // Pip
  greenSoft: '#9be6b3',
  rust: '#c05a3f', // Rosa
  rustSoft: '#e0987f',

  // Text tiers
  textDim: '#a9bccc',
  textMute: '#8a97a8',
  textFaint: '#6c7c8f',
  textGhost: '#5f7183',
  hairline: '#3f4c5c',

  // Status
  danger: '#e08a8a',
  dangerBg: 'rgba(190,70,70,.1)',
  dangerBorder: 'rgba(190,70,70,.45)',
} as const;

/** Per-character accent set — used for chips, borders, glows, level bars. */
export const charColors = {
  corvus: { main: colors.teal, soft: colors.tealSoft, glow: 'rgba(0,194,199,' },
  sage: { main: colors.purple, soft: colors.purpleSoft, glow: 'rgba(107,79,160,' },
  pip: { main: colors.green, soft: colors.greenSoft, glow: 'rgba(62,207,110,' },
  mira: { main: colors.gold, soft: colors.goldLight, glow: 'rgba(184,146,42,' },
  rosa: { main: colors.rust, soft: colors.rustSoft, glow: 'rgba(192,90,63,' },
} as const;

export const fonts = {
  display: 'Cinzel_700Bold', // titles
  displayHeavy: 'Cinzel_800ExtraBold',
  displayMed: 'Cinzel_600SemiBold',
  body: 'SpaceGrotesk_400Regular',
  bodyMed: 'SpaceGrotesk_500Medium',
  bodySemi: 'SpaceGrotesk_600SemiBold',
  bodyBold: 'SpaceGrotesk_700Bold',
  mono: 'SpaceMono_400Regular', // stats / numbers / labels
  monoBold: 'SpaceMono_700Bold',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 20,
  pill: 999,
  frame: 36,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Accent glow: box-shadow at 30-50% opacity of the element's own accent color. */
export function glow(rgbaPrefix: string, opacity = 0.4, radius = 24) {
  // React Native shadow — approximated for cross-platform. Color carries the accent.
  return {
    shadowColor: rgbaPrefixToHex(rgbaPrefix),
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: Math.round(radius / 2),
  };
}

function rgbaPrefixToHex(prefix: string): string {
  // Map the known glow prefixes back to a solid hex for shadowColor.
  if (prefix.startsWith('rgba(0,194,199')) return colors.teal;
  if (prefix.startsWith('rgba(107,79,160')) return colors.purple;
  if (prefix.startsWith('rgba(62,207,110')) return colors.green;
  if (prefix.startsWith('rgba(184,146,42')) return colors.gold;
  if (prefix.startsWith('rgba(192,90,63')) return colors.rust;
  return colors.teal;
}

/** Phone frame reference dimensions from the mockup (scale up proportionally). */
export const FRAME = { width: 320, height: 660 } as const;
