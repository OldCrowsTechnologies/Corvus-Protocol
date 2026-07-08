/**
 * Real-time tower-defense engine for a campaign run.
 *
 * Model (built against UI reference screen 10 — path-to-altar TD):
 *  - Enemies spawn from a per-wave queue and walk the path (t: 0→1) to the altar.
 *  - An enemy that reaches the altar "leaks" and costs circle integrity; 0 integrity = loss.
 *  - Towers auto-attack the furthest-along enemy in range on a DPS-derived cooldown.
 *  - Damage = dps × crit × proximity(Sage) × Mira-amp; Mira executes enemies < 30% HP.
 *  - Wave clears when the queue is empty and no enemies remain; wave 15 is Whisper (2 phases).
 *
 * State is mutated in place for per-frame performance; the screen holds it in a ref and only
 * syncs summary numbers to the persistent store on meaningful events.
 */
import { BOARD, PATH_LENGTH, pointAt, snapToBuildable } from './board';
import { ENEMIES, MAX_TOWERS, TOWERS } from './constants';
import {
  buildWaveSpawns,
  computeDamage,
  enemyHealthForWave,
  idleResonancePerSecond,
  killReward,
  spawnInterval,
} from './formulas';
import type {
  CampaignState,
  Difficulty,
  Enemy,
  EnemyType,
  Tower,
  TowerType,
  Vec2,
} from './types';

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

/**
 * Convert spec pixel range into normalized 0..1 board units.
 * Divisor tuned (not the literal 1080 board width) so towers cover 2-3 path tiles —
 * at 1080 they barely reached one tile and enemies slipped through. See stress/diag.
 */
function normRange(specPx: number): number {
  return specPx / 640;
}

/** Seconds between tower shots. Lower = higher effective DPS. Tuned for a winnable Normal. */
const FIRE_COOLDOWN = 0.55;
const MIRA_COOLDOWN = 0.8;

/** Damage-number label — "450", "1.2K" — matching the bible's punchy readout. */
function dmgLabel(n: number): string {
  const v = Math.round(n);
  return v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(v);
}

export interface TickEvents {
  kills: number;
  xp: Partial<Record<TowerType, number>>;
  waveCleared: number | null;
  won: boolean;
  lost: boolean;
  bossDefeated: boolean;
  crit: boolean;
  towerFired: boolean;
}

function emptyEvents(): TickEvents {
  return {
    kills: 0,
    xp: {},
    waveCleared: null,
    won: false,
    lost: false,
    bossDefeated: false,
    crit: false,
    towerFired: false,
  };
}

const DEFAULT_LEVELS: Record<TowerType, number> = { corvus: 1, sage: 1, pip: 1, mira: 1 };

export function createCampaign(params: {
  difficulty: Difficulty;
  epoch: number;
  affix: CampaignState['affix'];
  ritualActive: boolean;
  startResonance: number;
  charLevels?: Record<TowerType, number>;
}): CampaignState {
  return {
    campaignId: uid('campaign'),
    difficulty: params.difficulty,
    status: 'setup',
    wave: 0,
    waveInProgress: false,
    affix: params.affix,
    charLevels: params.charLevels ?? { ...DEFAULT_LEVELS },
    towers: [],
    enemies: [],
    floaties: [],
    resonance: params.startResonance,
    resonancePerSecond: idleResonancePerSecond(params.epoch, 0),
    elapsed: 0,
    integrity: 20,
    maxIntegrity: 20,
    leaked: 0,
    ritualActive: params.ritualActive,
    spawnQueue: [],
    nextSpawnAt: 0,
    waveStartAt: 0,
    bossPhaseAnnounced: false,
  };
}

/** Advance to the next wave and load its spawn queue. Call when status is 'setup' or between waves. */
export function beginNextWave(state: CampaignState, rng: () => number = Math.random): void {
  state.wave += 1;
  state.status = 'running';
  state.waveInProgress = true;
  const isBoss = state.wave >= 15;
  state.spawnQueue = buildWaveSpawns({
    wave: state.wave,
    isBoss,
    affixSwarm: state.affix === 'swarm',
    rng,
  });
  state.waveStartAt = state.elapsed + 5; // 5s telegraph before first spawn
  state.nextSpawnAt = state.waveStartAt;
  state.bossPhaseAnnounced = false;
}

export function canPlaceTower(state: CampaignState, type: TowerType): boolean {
  return state.towers.length < MAX_TOWERS && state.resonance >= TOWERS[type].cost;
}

/** Place a tower by normalized tap; snaps to nearest buildable tile. Returns true on success. */
export function placeTower(
  state: CampaignState,
  type: TowerType,
  nx: number,
  ny: number,
): boolean {
  if (!canPlaceTower(state, type)) return false;
  const occupied = state.towers.map((t) => t.pos);
  const tile = snapToBuildable(nx, ny, occupied);
  if (!tile) return false;
  state.resonance -= TOWERS[type].cost;
  state.towers.push({
    id: uid('tower'),
    type,
    pos: tile,
    level: 1,
    cooldown: 0,
    kills: 0,
    hitCount: 0,
  });
  state.resonancePerSecond = idleResonancePerSecond(0, state.towers.length);
  return true;
}

export function sellTower(state: CampaignState, id: string): void {
  const idx = state.towers.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = state.towers[idx];
  // refund 50% of everything sunk in (base + upgrades)
  const sunk = TOWERS[t.type].cost + upgradeSpend(t.type, t.level);
  state.resonance += Math.round(sunk * 0.5);
  state.towers.splice(idx, 1);
  state.resonancePerSecond = idleResonancePerSecond(0, state.towers.length);
}

export const MAX_TOWER_LEVEL = 5;

/** Cost to upgrade a tower from its current level to the next. Scales with level. */
export function upgradeCost(type: TowerType, level: number): number {
  return Math.round(TOWERS[type].cost * 0.7 * level);
}

/** Total Resonance sunk into upgrades to reach `level` (for sell refunds). */
function upgradeSpend(type: TowerType, level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += upgradeCost(type, l);
  return total;
}

/** Upgrade a placed tower one level in-wave. Returns true if it happened. */
export function upgradeTower(state: CampaignState, id: string): boolean {
  const t = state.towers.find((x) => x.id === id);
  if (!t || t.level >= MAX_TOWER_LEVEL) return false;
  const cost = upgradeCost(t.type, t.level);
  if (state.resonance < cost) return false;
  state.resonance -= cost;
  t.level += 1;
  return true;
}

/** Effective per-shot damage for a tower, factoring its upgrade level (+30%/level). */
export function towerDps(type: TowerType, level: number): number {
  return TOWERS[type].dps * (1 + 0.3 * (level - 1));
}

/** Effective normalized range for a tower, factoring its upgrade level (+6%/level). */
export function towerRangeNorm(type: TowerType, level: number): number {
  return normRange(TOWERS[type].range) * (1 + 0.06 * (level - 1));
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function spawnEnemy(state: CampaignState, type: EnemyType): void {
  const def = ENEMIES[type];
  const hp = enemyHealthForWave(def.baseHealth, state.wave, state.difficulty)
    * (state.affix === 'veil' ? 1.15 : 1);
  const enemy: Enemy = {
    id: uid('enemy'),
    type,
    t: 0,
    pos: pointAt(0),
    health: hp,
    maxHealth: hp,
    speed: def.speed * (state.affix === 'frenzy' ? 1.2 : 1),
    slowUntil: 0,
    bossPhase: type === 'whisper' ? 1 : undefined,
  };
  state.enemies.push(enemy);
}

/** Character level for a tower type this run (1..10). */
function lvl(state: CampaignState, type: TowerType): number {
  return Math.max(1, Math.min(10, Math.floor(state.charLevels[type] ?? 1)));
}

/**
 * Total Sage-aura buff fraction on a tower. Each nearby Sage contributes 0.15,
 * strengthened by that Sage's level: +1.5% per level (spec: +2% durability/level, adapted).
 */
function sageBuff(state: CampaignState, t: Tower): number {
  const sageLevel = lvl(state, 'sage');
  const auraRange = normRange(TOWERS.sage.range);
  let buff = 0;
  for (const other of state.towers) {
    if (other.id === t.id) continue;
    if (other.type === 'sage' && dist(other.pos, t.pos) <= auraRange) {
      buff += 0.15 + 0.015 * (sageLevel - 1);
    }
  }
  return buff;
}

/** Mira amplification if a Mira tower is in range. Mira level extends the aura range (spec: +5px/level). */
function miraAmp(state: CampaignState, t: Tower): number {
  const auraRange = normRange(TOWERS.mira.range + 5 * (lvl(state, 'mira') - 1));
  for (const other of state.towers) {
    if (other.type === 'mira' && dist(other.pos, t.pos) <= auraRange) return 1.5;
  }
  return 1.0;
}

function addFloaty(state: CampaignState, pos: Vec2, value: string, crit: boolean, color: string): void {
  state.floaties.push({ id: uid('float'), pos: { ...pos }, value, crit, born: state.elapsed, color });
  if (state.floaties.length > 24) state.floaties.shift();
}

function damageEnemy(
  state: CampaignState,
  enemy: Enemy,
  rawDamage: number,
  ev: TickEvents,
  sourceType: TowerType,
): void {
  const def = ENEMIES[enemy.type];
  let dr = def.damageReduction;
  if (enemy.type === 'whisper' && enemy.bossPhase === 2) dr = Math.max(dr, 0.5); // P2 −50% dmg taken
  const applied = rawDamage * (1 - dr);
  enemy.health -= applied;

  if (enemy.type === 'whisper' && enemy.bossPhase === 1 && enemy.health <= enemy.maxHealth * 0.5) {
    enemy.bossPhase = 2;
    enemy.speed *= 1.4; // accelerates
  }

  if (enemy.health <= 0) {
    killEnemy(state, enemy, ev, sourceType);
  }
}

function killEnemy(state: CampaignState, enemy: Enemy, ev: TickEvents, sourceType: TowerType): void {
  const idx = state.enemies.findIndex((e) => e.id === enemy.id);
  if (idx === -1) return;
  state.enemies.splice(idx, 1);

  const rewardMult = state.ritualActive ? 1.5 : 1;
  const reward = Math.round(killReward(enemy.maxHealth) * rewardMult);
  state.resonance += reward;
  ev.kills += 1;
  ev.xp[sourceType] = (ev.xp[sourceType] ?? 0) + (enemy.type === 'whisper' ? 40 : 4);
  if (enemy.type === 'whisper') ev.bossDefeated = true;
}

function fireTower(state: CampaignState, t: Tower, ev: TickEvents, rng: () => number): void {
  const def = TOWERS[t.type];
  if (def.dps <= 0 && t.type !== 'mira') return;

  let range = towerRangeNorm(t.type, t.level); // includes upgrade-level bonus
  if (state.affix === 'fog') range *= 0.9; // FOG −10% range

  // Mira deals no direct damage but executes low-HP enemies in range.
  if (t.type === 'mira') {
    const execRange = range + normRange(5 * (lvl(state, 'mira') - 1));
    const execThreshold = 0.3 + 0.01 * (lvl(state, 'mira') - 1); // higher level executes sooner
    const exec = state.enemies.find(
      (e) => e.type !== 'whisper' && e.health <= e.maxHealth * execThreshold && dist(e.pos, t.pos) <= execRange,
    );
    if (exec) {
      addFloaty(state, exec.pos, 'EXECUTE', true, '#E4C15A');
      killEnemy(state, exec, ev, 'mira');
      t.kills += 1;
      t.cooldown = MIRA_COOLDOWN;
      ev.towerFired = true;
    }
    return;
  }

  // Target the enemy furthest along the path that's in range.
  let target: Enemy | null = null;
  for (const e of state.enemies) {
    if (dist(e.pos, t.pos) <= range && (!target || e.t > target.t)) target = e;
  }
  if (!target) return;

  const proximity = sageBuff(state, t);
  const amp = miraAmp(state, t);
  // Corvus: +1% crit chance per level (spec).
  const critChance = def.critChance + (t.type === 'corvus' ? 0.01 * (lvl(state, 'corvus') - 1) : 0);
  const { damage, crit } = computeDamage({
    dps: towerDps(t.type, t.level), // includes upgrade-level bonus
    critChance,
    proximityBuff: proximity,
    miraAmp: amp,
    rng,
  });

  // A "shot" delivers dps worth of damage; cooldown normalizes to ~1 shot/sec baseline.
  const shot = damage;
  damageEnemy(state, target, shot, ev, t.type);
  t.hitCount += 1;
  t.cooldown = FIRE_COOLDOWN;
  ev.towerFired = true;
  if (crit) ev.crit = true;

  // Bible damage-number style: magenta glow, "!" punch, "CRIT!" call-outs.
  addFloaty(
    state,
    target.pos,
    crit ? `${dmgLabel(shot)}  CRIT!` : `${dmgLabel(shot)}!`,
    crit,
    crit ? '#f06fd0' : '#d9c2ec',
  );

  // Pip: every 3rd hit chains to nearby enemies. Level boosts chain damage (+3%/lvl) and,
  // from L8, adds a 3rd chain target (spec: theft rate +3%/level).
  if (t.type === 'pip' && t.hitCount % 3 === 0) {
    const pipLevel = lvl(state, 'pip');
    const chainRange = normRange(120);
    const chainFrac = 0.6 + 0.03 * (pipLevel - 1);
    const maxTargets = pipLevel >= 8 ? 3 : 2;
    let chained = 0;
    for (const e of state.enemies) {
      if (chained >= maxTargets) break;
      if (e.id === target.id) continue;
      if (dist(e.pos, target.pos) <= chainRange) {
        damageEnemy(state, e, shot * chainFrac, ev, 'pip');
        addFloaty(state, e.pos, `${dmgLabel(shot * chainFrac)}`, false, '#9be6b3');
        chained += 1;
      }
    }
  }
}

/** Advance the simulation by dt seconds. Mutates `state`; returns events for the store to apply. */
export function tickCampaign(
  state: CampaignState,
  dt: number,
  rng: () => number = Math.random,
): TickEvents {
  const ev = emptyEvents();
  if (state.status !== 'running') return ev;

  state.elapsed += dt;

  // passive idle income
  state.resonance += state.resonancePerSecond * dt;

  // spawns
  const aliveNonBoss = state.enemies.length;
  while (state.spawnQueue.length > 0 && state.elapsed >= state.nextSpawnAt) {
    const type = state.spawnQueue.shift()!;
    spawnEnemy(state, type);
    const interval = spawnInterval(state.affix === 'swarm', aliveNonBoss);
    state.nextSpawnAt = state.elapsed + interval;
  }

  // move enemies
  for (const e of state.enemies) {
    const spd = e.slowUntil > state.elapsed ? e.speed * 0.5 : e.speed;
    e.t += spd * dt;
    e.pos = pointAt(e.t);
    if (e.t >= 1) {
      // leak — reaches altar
      const dmg = e.type === 'whisper' ? 5 : e.type === 'husk' ? 2 : 1;
      state.integrity = Math.max(0, state.integrity - dmg);
      state.leaked += 1;
      addFloaty(state, e.pos, '−' + dmg, true, '#e08a8a');
      e.health = 0;
    }
  }
  state.enemies = state.enemies.filter((e) => e.health > 0);

  // towers fire
  for (const t of state.towers) {
    if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown <= 0) fireTower(state, t, ev, rng);
  }

  // age out floaties
  state.floaties = state.floaties.filter((f) => state.elapsed - f.born < 1.0);

  // loss check
  if (state.integrity <= 0) {
    state.status = 'lost';
    ev.lost = true;
    return ev;
  }

  // wave clear check
  if (state.waveInProgress && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveInProgress = false;
    ev.waveCleared = state.wave;
    if (state.wave >= 15) {
      state.status = 'won';
      ev.won = true;
    }
  }

  return ev;
}

export { normRange, BOARD };
