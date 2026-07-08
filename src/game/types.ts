import type { CharId } from '@/cast';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type TowerType = 'corvus' | 'sage' | 'pip' | 'mira';

export type EnemyType = 'wisp' | 'wailer' | 'shrieker' | 'husk' | 'whisper';

/** Wave affix — rolled at wave start from a small enum, surfaced on the HUD. */
export type AffixId = 'none' | 'swarm' | 'fog' | 'frenzy' | 'veil';

export interface Affix {
  id: AffixId;
  label: string;
  blurb: string;
}

// ---- Live campaign entities (grid coordinates in tile units) ----

export interface Vec2 {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  /** pixel-space board position */
  pos: Vec2;
  level: number;
  cooldown: number; // seconds until next shot
  kills: number;
  hitCount: number; // for Pip's every-3rd-hit chain
}

export interface Enemy {
  id: string;
  type: EnemyType;
  /** progress along the path, 0..1 */
  t: number;
  pos: Vec2;
  health: number;
  maxHealth: number;
  speed: number; // path-units per second
  slowUntil: number; // elapsed time slow effect expires
  bossPhase?: 1 | 2;
}

export interface FloatingText {
  id: string;
  pos: Vec2;
  value: string;
  crit: boolean;
  born: number; // elapsed seconds
  color: string;
}

export type CampaignStatus = 'setup' | 'running' | 'won' | 'lost';

export interface CampaignState {
  campaignId: string;
  difficulty: Difficulty;
  status: CampaignStatus;
  wave: number; // 0 = pre-wave, 1..15
  waveInProgress: boolean;
  affix: AffixId;
  /** Character levels at run start — scale each tower's per-level benefit. */
  charLevels: Record<TowerType, number>;
  towers: Tower[];
  enemies: Enemy[];
  floaties: FloatingText[];
  resonance: number;
  resonancePerSecond: number;
  elapsed: number; // seconds
  integrity: number; // circle integrity (lives); 0 = loss
  maxIntegrity: number;
  leaked: number; // enemies that reached the altar
  ritualActive: boolean; // Basic Ritual +50% resonance this run
  spawnQueue: EnemyType[];
  nextSpawnAt: number; // elapsed time of next spawn
  waveStartAt: number; // elapsed time the current wave's spawns begin
  bossPhaseAnnounced: boolean;
}

// ---- Persistent account ----

export interface CharacterProgress {
  level: number;
  xp: number;
  xpMax: number;
}

export interface DailyQuest {
  id: string;
  label: string;
  progress: number;
  target: number;
  reward: number; // feathers
  bonusResonance?: number;
  isAd?: boolean;
  claimed: boolean;
}

export interface DailyRituals {
  streakDay: number; // 1..7
  lastClaimDayIndex: number; // day-of-epoch integer for streak bookkeeping
  quests: DailyQuest[];
  weekly: {
    id: string;
    label: string;
    progress: number;
    target: number;
    reward: number;
    claimed: boolean;
  };
}

export type BoneCastRarity =
  | 'resonance_small'
  | 'resonance_burst'
  | 'rune'
  | 'feathers'
  | 'cosmetic';

export interface BoneCastResult {
  rarity: BoneCastRarity;
  label: string;
  detail: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface BoneCastState {
  freeCastsRemaining: number;
  castsSincePity: number;
  lastResult: BoneCastResult | null;
}

export interface Settings {
  sfx: boolean;
  voice: boolean;
  graphics: 'low' | 'high';
  debugMetrics: boolean;
}

export interface Account {
  uid: string;
  epoch: number;
  prestigeMultiplier: number;
  resonance: number; // soft currency bank — spent on towers/rituals, reset on prestige
  feathers: number; // premium currency — persists through prestige
  characters: Record<TowerType, CharacterProgress>;
  cosmetics: { skins: string[]; familiars: string[]; equippedSkin: string };
  consumables: { ritual: number };
  runes: string[];
  subscription: { conveniencePassActive: boolean };
  adMetrics: { todayWatched: number };
  offline: { lastSeenAt: number };
  rosaUnlocked: boolean;
}

export const CHAR_ORDER: CharId[] = ['corvus', 'sage', 'pip', 'mira', 'rosa'];
export const TOWER_ORDER: TowerType[] = ['corvus', 'sage', 'pip', 'mira'];
