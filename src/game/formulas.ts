/**
 * Pure gameplay math — mirrors ORIGINAL_GAME_SPEC.md Part 3.
 * All functions here are deterministic given their inputs (rng passed in), so they're unit-testable.
 */
import { DIFFICULTIES, OFFLINE_CAP_HOURS } from './constants';
import type { Difficulty, EnemyType } from './types';

/**
 * Prestige multiplier = 1.5^epoch.
 * The handoff prose says "(epoch+1) × 1.5^epoch", but every concrete number it and the
 * design mockup show (epoch 2 → 2.25×, epoch 3 → 3.375×, "reset with 1.5x") is 1.5^epoch.
 * The canonical numbers win. epoch 0 → 1.0×, epoch 1 → 1.5×.
 */
export function prestigeMultiplier(epoch: number): number {
  return Math.pow(1.5, Math.max(0, epoch));
}

export function nextPrestigeMultiplier(epoch: number): number {
  return prestigeMultiplier(epoch + 1);
}

export function difficultyDef(id: Difficulty) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

/** Enemy count for a wave: 3 + N (wave 1 = 4, wave 15 handled as boss). */
export function waveEnemyCount(wave: number): number {
  return 3 + wave;
}

/** Per-enemy health: 50 * (1 + wave/10) * difficulty health modifier. */
export function enemyHealthForWave(
  base: number,
  wave: number,
  difficulty: Difficulty,
): number {
  const diff = difficultyDef(difficulty);
  const waveScale = 1 + wave / 10;
  return Math.round(base * waveScale * diff.healthMult);
}

/**
 * Damage calculation (spec Part 3):
 *   baseDamage = tower.dps
 *   crit = rand < critChance ? 2 : 1
 *   proximity_buff = 1 + (nearbyBuffTowers × 0.15)
 *   final = base × crit × proximity × miraAmp
 */
export function computeDamage(params: {
  dps: number;
  critChance: number;
  proximityBuffTowers: number;
  miraAmp: number; // 1.0 or 1.5+ if Mira in range
  rng: () => number;
}): { damage: number; crit: boolean } {
  const crit = params.rng() < params.critChance;
  const critMult = crit ? 2.0 : 1.0;
  const proximity = 1 + params.proximityBuffTowers * 0.15;
  const damage = params.dps * critMult * proximity * params.miraAmp;
  return { damage, crit };
}

/** Resonance from a kill = enemy max health × 0.5. */
export function killReward(enemyMaxHealth: number): number {
  return enemyMaxHealth * 0.5;
}

/**
 * Offline Resonance:
 *   base 10 × prestigeMult × (pass ? 1.5 : 1) × hours, capped at 8h.
 */
export function offlineResonance(params: {
  epoch: number;
  secondsElapsed: number;
  conveniencePass: boolean;
}): { earned: number; hours: number; capped: boolean } {
  // Defend against clock skew / tampered timestamps: never negative, never NaN.
  const safeSeconds = Number.isFinite(params.secondsElapsed) ? Math.max(0, params.secondsElapsed) : 0;
  const cappedSeconds = Math.min(safeSeconds, OFFLINE_CAP_HOURS * 3600);
  const hours = cappedSeconds / 3600;
  const mult = prestigeMultiplier(params.epoch);
  const pass = params.conveniencePass ? 1.5 : 1.0;
  const earned = Math.round(10 * mult * pass * hours);
  return {
    earned,
    hours,
    capped: safeSeconds >= OFFLINE_CAP_HOURS * 3600,
  };
}

/** Idle resonance-per-second while a campaign runs (base + tower income). */
export function idleResonancePerSecond(epoch: number, towerCount: number): number {
  return Math.round((10 + towerCount * 8) * Math.max(1, prestigeMultiplier(epoch) * 0.3));
}

/**
 * Build the ordered spawn list for a wave. Boss waves return a single whisper.
 * Shrieker "spawns ×3" is expanded here. `swarm` affix shuffles order.
 */
export function buildWaveSpawns(params: {
  wave: number;
  isBoss: boolean;
  affixSwarm: boolean;
  rng: () => number;
}): EnemyType[] {
  if (params.isBoss) return ['whisper'];

  const count = waveEnemyCount(params.wave);
  const out: EnemyType[] = [];

  for (let i = 0; i < count; i++) {
    const roll = params.rng();
    // composition shifts toward tougher enemies in later waves
    const w = params.wave;
    if (w >= 10 && roll < 0.18) {
      out.push('husk');
    } else if (w >= 4 && roll < 0.34) {
      out.push('shrieker', 'shrieker', 'shrieker'); // swarm ×3
    } else if (w >= 3 && roll < 0.52) {
      out.push('wailer');
    } else {
      out.push('wisp');
    }
  }

  if (params.affixSwarm) {
    // Fisher-Yates with injected rng
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(params.rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out;
}

/** Spawn interval seconds: base 2s, faster with swarm affix, slower when board is crowded. */
export function spawnInterval(affixSwarm: boolean, aliveCount: number): number {
  let interval = 2.0;
  if (affixSwarm) interval *= 0.7; // +30% rate
  if (aliveCount > 3) interval *= 1.5; // spec: >3 alive slows spawn 50%
  return interval;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0'; // never surface NaN/Infinity to the player
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (n >= 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString('en-US');
}
