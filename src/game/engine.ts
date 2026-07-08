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

/** Convert spec pixel range (based on a 1080-wide board) into normalized 0..1 board units. */
function normRange(specPx: number): number {
  return specPx / 1080;
}

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

export function createCampaign(params: {
  difficulty: Difficulty;
  epoch: number;
  affix: CampaignState['affix'];
  ritualActive: boolean;
  startResonance: number;
}): CampaignState {
  return {
    campaignId: uid('campaign'),
    difficulty: params.difficulty,
    status: 'setup',
    wave: 0,
    waveInProgress: false,
    affix: params.affix,
    towers: [],
    enemies: [],
    floaties: [],
    resonance: params.startResonance,
    resonancePerSecond: idleResonancePerSecond(params.epoch, 0),
    elapsed: 0,
    integrity: 10,
    maxIntegrity: 10,
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
  state.resonance += Math.round(TOWERS[t.type].cost * 0.5); // 50% refund
  state.towers.splice(idx, 1);
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

/** Count nearby Sage towers that buff a given tower (proximity aura). */
function sageProximity(state: CampaignState, t: Tower): number {
  const auraRange = normRange(TOWERS.sage.range);
  let n = 0;
  for (const other of state.towers) {
    if (other.id === t.id) continue;
    if (other.type === 'sage' && dist(other.pos, t.pos) <= auraRange) n += 1;
  }
  return n;
}

/** Mira amplification if a Mira tower is in range of this tower. */
function miraAmp(state: CampaignState, t: Tower): number {
  const auraRange = normRange(TOWERS.mira.range);
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

  let range = normRange(def.range);
  if (state.affix === 'fog') range *= 0.9; // FOG −10% range

  // Mira deals no direct damage but executes low-HP enemies in range.
  if (t.type === 'mira') {
    const exec = state.enemies.find(
      (e) => e.type !== 'whisper' && e.health <= e.maxHealth * 0.3 && dist(e.pos, t.pos) <= range,
    );
    if (exec) {
      addFloaty(state, exec.pos, 'EXECUTE', true, '#E4C15A');
      killEnemy(state, exec, ev, 'mira');
      t.kills += 1;
      t.cooldown = 1.2;
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

  const proximity = sageProximity(state, t);
  const amp = miraAmp(state, t);
  const { damage, crit } = computeDamage({
    dps: def.dps,
    critChance: def.critChance,
    proximityBuffTowers: proximity,
    miraAmp: amp,
    rng,
  });

  // A "shot" delivers dps worth of damage; cooldown normalizes to ~1 shot/sec baseline.
  const shot = damage;
  damageEnemy(state, target, shot, ev, t.type);
  t.hitCount += 1;
  t.cooldown = 0.9;
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

  // Pip: every 3rd hit chains to up to 2 nearby enemies.
  if (t.type === 'pip' && t.hitCount % 3 === 0) {
    const chainRange = normRange(120);
    let chained = 0;
    for (const e of state.enemies) {
      if (chained >= 2) break;
      if (e.id === target.id) continue;
      if (dist(e.pos, target.pos) <= chainRange) {
        damageEnemy(state, e, shot * 0.6, ev, 'pip');
        addFloaty(state, e.pos, `${dmgLabel(shot * 0.6)}`, false, '#9be6b3');
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
