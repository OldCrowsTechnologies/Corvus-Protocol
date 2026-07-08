import { colors } from '@/theme/tokens';
import type {
  Affix,
  AffixId,
  Difficulty,
  EnemyType,
  TowerType,
} from './types';

export const MAX_WAVES = 15;
export const BOSS_WAVE = 15;
export const MAX_TOWERS = 8;
export const TOWER_HEALTH = 100;
export const OFFLINE_CAP_HOURS = 12;

export interface TowerDef {
  type: TowerType;
  name: string;
  role: string; // CHAOS / SUPPORT / THEFT / EXEC
  cost: number;
  dps: number;
  range: number; // pixels
  critChance: number;
  special: string;
  color: string;
  glowPrefix: string;
}

export const TOWERS: Record<TowerType, TowerDef> = {
  corvus: {
    type: 'corvus',
    name: 'Corvus Spike',
    role: 'CHAOS',
    cost: 200,
    dps: 15,
    range: 200,
    critChance: 0.15,
    special: 'Taunt aura draws enemy fire; crits chain chaos through the flock.',
    color: colors.teal,
    glowPrefix: 'rgba(0,194,199,',
  },
  sage: {
    type: 'sage',
    name: 'Sage Bastion',
    role: 'SUPPORT',
    cost: 300,
    dps: 10,
    range: 180,
    critChance: 0,
    special: '+15% damage to nearby towers.',
    color: colors.purple,
    glowPrefix: 'rgba(107,79,160,',
  },
  pip: {
    type: 'pip',
    name: 'Pip Needle',
    role: 'THEFT',
    cost: 250,
    dps: 12,
    range: 220,
    critChance: 0.1,
    special: 'Every 3rd hit chains to 2 nearby enemies.',
    color: colors.green,
    glowPrefix: 'rgba(62,207,110,',
  },
  mira: {
    type: 'mira',
    name: 'Mira Amplifier',
    role: 'EXEC',
    cost: 500,
    dps: 0,
    range: 250,
    critChance: 0,
    special: 'No damage — multiplies nearby tower damage ×1.5. Executes enemies < 30% HP.',
    color: colors.gold,
    glowPrefix: 'rgba(184,146,42,',
  },
};

export interface EnemyDef {
  type: EnemyType;
  name: string;
  tag: string;
  baseHealth: number;
  speed: number; // path-units/sec (path length is normalized to 1.0)
  damageReduction: number; // 0..1
  blurb: string;
  lore: string;
  size: number; // render px
  color: string; // rgba fill
  border: string;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  wisp: {
    type: 'wisp',
    name: 'Whisperling',
    tag: 'FODDER',
    baseHealth: 50,
    speed: 0.12,
    damageReduction: 0,
    blurb: 'HP 50 · SPD FAST',
    lore: 'The first to break the silence.',
    size: 16,
    color: 'rgba(190,205,225,0.55)',
    border: 'rgba(190,205,225,0.8)',
  },
  wailer: {
    type: 'wailer',
    name: 'Echo Wraith',
    tag: 'DEBUFFER',
    baseHealth: 90,
    speed: 0.06,
    damageReduction: 0,
    blurb: 'HP 90 · SPD SLOW · −10% tower accuracy nearby',
    lore: "Its cry dulls your towers' aim.",
    size: 18,
    color: 'rgba(175,195,120,0.55)',
    border: 'rgba(175,195,120,0.8)',
  },
  shrieker: {
    type: 'shrieker',
    name: 'Void Shrieker',
    tag: 'SWARM',
    baseHealth: 40,
    speed: 0.16,
    damageReduction: 0,
    blurb: 'HP 40 · SPD VERY FAST · spawns ×3',
    lore: 'Comes in threes. Rarely alone.',
    size: 14,
    color: 'rgba(220,120,170,0.55)',
    border: 'rgba(220,120,170,0.8)',
  },
  husk: {
    type: 'husk',
    name: 'Mourning Titan',
    tag: 'TANK',
    baseHealth: 220,
    speed: 0.05,
    damageReduction: 0.2,
    blurb: 'HP 220 · SPD SLOW · 20% damage reduction',
    lore: 'Armor of grief, worn like bone.',
    size: 22,
    color: 'rgba(120,110,130,0.6)',
    border: 'rgba(150,120,180,0.7)',
  },
  whisper: {
    type: 'whisper',
    name: 'Whisper',
    tag: 'BOSS · WAVE 15',
    baseHealth: 1000,
    speed: 0.045,
    damageReduction: 0,
    blurb: 'HP 1000 · P1 normal dmg · P2 (<50%) −50% dmg taken, +speed',
    lore: 'It does not walk. It arrives.',
    size: 34,
    color: '#0c0a12',
    border: 'rgba(255,255,255,0.6)',
  },
};

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  rewardMult: number;
  healthMult: number;
  blurb: string;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'easy',
    name: 'EASY',
    rewardMult: 0.7,
    healthMult: 0.7,
    blurb: 'Gentler waves. Enemy health ×0.7. For learning the ritual.',
  },
  {
    id: 'normal',
    name: 'NORMAL',
    rewardMult: 1.0,
    healthMult: 1.0,
    blurb: 'The intended balance. 15 waves, Whisper at wave 15.',
  },
  {
    id: 'hard',
    name: 'HARD',
    rewardMult: 1.3,
    healthMult: 1.3,
    blurb: 'Enemy health ×1.3. Boss moves faster. For the devout.',
  },
];

export const AFFIXES: Record<AffixId, Affix> = {
  none: { id: 'none', label: 'CALM', blurb: 'No omen this run.' },
  swarm: { id: 'swarm', label: 'SWARM', blurb: 'Spawn rate +30%, randomized order.' },
  fog: { id: 'fog', label: 'FOG', blurb: 'Tower range −10% — the veil thickens.' },
  frenzy: { id: 'frenzy', label: 'FRENZY', blurb: 'Enemies move +20% faster.' },
  veil: { id: 'veil', label: 'VEIL', blurb: 'Enemies +15% health, +25% reward.' },
};

export const ROLLABLE_AFFIXES: AffixId[] = ['swarm', 'fog', 'frenzy', 'veil'];

/** Character role labels for chips/roster. */
export const CHAR_META = {
  corvus: { name: 'CORVUS', role: 'CHAOS · CROWD CONTROL' },
  sage: { name: 'SAGE', role: 'WARDING · SUPPORT' },
  pip: { name: 'PIP', role: 'THEFT · CRIT' },
  mira: { name: 'MIRA', role: 'AMPLIFY · EXECUTE' },
  rosa: { name: 'ROSA', role: 'PURSUIT · MARKING' },
} as const;
