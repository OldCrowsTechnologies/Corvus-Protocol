/**
 * Bone-Cast — the disclosed-odds variable-reward roll.
 * Odds ledger and pity rule are player-facing (App-Store compliance safeguard):
 *   guaranteed Rune+ every 10 casts. Keep the ledger and this table in sync with the UI.
 */
import { colors } from '@/theme/tokens';
import type { BoneCastRarity, BoneCastResult } from './types';

export const PITY_INTERVAL = 10;

export interface OddsRow {
  rarity: BoneCastRarity;
  label: string;
  pct: number; // percent
  color: string;
}

/** Disclosed odds ledger — exactly what the pre-roll screen shows. */
export const ODDS: OddsRow[] = [
  { rarity: 'resonance_small', label: 'Resonance (small)', pct: 62, color: colors.textFaint },
  { rarity: 'resonance_burst', label: 'Resonance (burst)', pct: 23, color: colors.teal },
  { rarity: 'rune', label: 'Rune shard', pct: 10, color: colors.purple },
  { rarity: 'feathers', label: '25 Murder Coins', pct: 4, color: colors.gold },
  { rarity: 'cosmetic', label: 'Cosmetic (rare)', pct: 1, color: colors.goldLight },
];

const RUNE_NAMES = [
  { name: 'Ember Sight', detail: '+8% crit chance, all towers' },
  { name: 'Hollow Ward', detail: '+12% tower durability' },
  { name: 'Carrion Echo', detail: '+10% Resonance from kills' },
  { name: 'Pale Thread', detail: 'Chains extend to +1 target' },
];

const COSMETICS = [
  { name: 'Corvus · Ashen Wing', detail: 'Cosmetic skin' },
  { name: 'Altar · Violet Vigil', detail: 'Cosmetic board' },
];

function tierFor(rarity: BoneCastRarity): BoneCastResult['tier'] {
  switch (rarity) {
    case 'resonance_small':
      return 'common';
    case 'resonance_burst':
      return 'uncommon';
    case 'rune':
      return 'rare';
    case 'feathers':
      return 'rare';
    case 'cosmetic':
      return 'legendary';
  }
}

function buildResult(rarity: BoneCastRarity, rng: () => number): BoneCastResult {
  switch (rarity) {
    case 'resonance_small': {
      const amt = 250 + Math.floor(rng() * 500);
      return { rarity, tier: tierFor(rarity), label: `${amt} Resonance`, detail: 'A small offering.' };
    }
    case 'resonance_burst': {
      const amt = 1500 + Math.floor(rng() * 3500);
      return { rarity, tier: tierFor(rarity), label: `${amt} Resonance`, detail: 'The engine surges.' };
    }
    case 'rune': {
      const r = RUNE_NAMES[Math.floor(rng() * RUNE_NAMES.length)];
      return { rarity, tier: tierFor(rarity), label: `Rune: ${r.name}`, detail: r.detail };
    }
    case 'feathers':
      return { rarity, tier: tierFor(rarity), label: '25 Murder Coins', detail: 'The Chorus is generous.' };
    case 'cosmetic': {
      const c = COSMETICS[Math.floor(rng() * COSMETICS.length)];
      return { rarity, tier: tierFor(rarity), label: c.name, detail: c.detail };
    }
  }
}

/**
 * Roll a single cast.
 * @param castsSincePity how many casts since the last Rune+ (pity trips at PITY_INTERVAL).
 */
export function rollBoneCast(
  castsSincePity: number,
  rng: () => number = Math.random,
): { result: BoneCastResult; pityTriggered: boolean } {
  const pity = castsSincePity + 1 >= PITY_INTERVAL;
  if (pity) {
    // Force a Rune+ (rune, feathers, or cosmetic) on the pity cast.
    const roll = rng();
    const rarity: BoneCastRarity = roll < 0.8 ? 'rune' : roll < 0.95 ? 'feathers' : 'cosmetic';
    return { result: buildResult(rarity, rng), pityTriggered: true };
  }

  let roll = rng() * 100;
  for (const row of ODDS) {
    if (roll < row.pct) return { result: buildResult(row.rarity, rng), pityTriggered: false };
    roll -= row.pct;
  }
  return { result: buildResult('resonance_small', rng), pityTriggered: false };
}

/** Is this result a "Rune+" (rune, feathers, or cosmetic)? Resets the pity counter. */
export function isRunePlus(rarity: BoneCastRarity): boolean {
  return rarity === 'rune' || rarity === 'feathers' || rarity === 'cosmetic';
}

export const CAST_X10_COST = 80; // Murder Coins
