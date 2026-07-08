/**
 * Device/responsive scaling. Kept SEPARATE from tokens.ts so that tokens (and the
 * game logic that imports colors) stay free of any `react-native` import — the headless
 * stress harness imports the engine, and RN's Flow-typed entry can't be parsed by Node.
 */
import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SHORT = Math.min(SCREEN_W, SCREEN_H);
const LONG = Math.max(SCREEN_W, SCREEN_H);

/** True on tablet-class devices (short edge ≥ 600dp). */
export const isTablet = SHORT >= 600;

/**
 * Global UI scale. Text and key sizes multiply by this so the app reads large and
 * legible on a small phone and scales up further on a tablet. Base design width ≈ 380dp.
 */
export const uiScale = Math.min(Math.max(SHORT / 380, 1), isTablet ? 1.7 : 1.32);

/** Font-size helper: ~24% over the old baseline, then device-scaled. */
export function fs(size: number): number {
  return Math.round(size * 1.24 * uiScale);
}

export const screen = { width: SCREEN_W, height: SCREEN_H, short: SHORT, long: LONG };
