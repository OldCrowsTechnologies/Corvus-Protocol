// Functional stress / fuzz harness — tries to break the game logic.
// Run: npm run stress
import {
  prestigeMultiplier,
  nextPrestigeMultiplier,
  offlineResonance,
  formatNumber,
  buildWaveSpawns,
  enemyHealthForWave,
  waveEnemyCount,
  spawnInterval,
  computeDamage,
  killReward,
} from '../src/game/formulas.ts';
import { rollBoneCast, isRunePlus, ODDS, PITY_INTERVAL } from '../src/game/boneCast.ts';
import {
  createCampaign,
  beginNextWave,
  tickCampaign,
  placeTower,
  sellTower,
  canPlaceTower,
} from '../src/game/engine.ts';
import { MAX_TOWERS, MAX_WAVES, DIFFICULTIES, ROLLABLE_AFFIXES } from '../src/game/constants.ts';
import { BUILDABLE, PATH } from '../src/game/board.ts';

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(msg);
    if (failures.length <= 40) console.error('  ✗', msg);
  }
}
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// ---------------------------------------------------------------------------
console.log('\n== formulas ==');
ok(Math.abs(prestigeMultiplier(0) - 1) < 1e-9, 'prestige(0)=1');
ok(Math.abs(prestigeMultiplier(1) - 1.5) < 1e-9, 'prestige(1)=1.5');
ok(Math.abs(prestigeMultiplier(2) - 2.25) < 1e-9, 'prestige(2)=2.25');
ok(Math.abs(prestigeMultiplier(3) - 3.375) < 1e-9, 'prestige(3)=3.375 (canonical)');
ok(prestigeMultiplier(-5) >= 1, 'prestige(negative) clamps >=1');
for (let e = 0; e <= 60; e++) ok(finite(prestigeMultiplier(e)), `prestige(${e}) finite`);
ok(nextPrestigeMultiplier(3) > prestigeMultiplier(3), 'next multiplier grows');

// offline: cap at 8h, never negative, handles junk time
for (const secs of [-99999, 0, 60, 3600, 8 * 3600, 999 * 3600, NaN, Infinity]) {
  const r = offlineResonance({ epoch: 3, secondsElapsed: secs, conveniencePass: true });
  ok(finite(r.earned) && r.earned >= 0, `offline earned finite&>=0 for secs=${secs} (got ${r.earned})`);
  ok(r.hours >= 0 && r.hours <= 8 + 1e-9, `offline hours capped 0..8 for secs=${secs} (got ${r.hours})`);
}

// formatNumber must never emit "NaN"/"undefined"/crash
for (const n of [NaN, Infinity, -Infinity, -5, 0, 1, 999, 1000, 12345, 1e6, 1e21, -1e9]) {
  const s = formatNumber(n);
  ok(typeof s === 'string' && !s.includes('NaN') && !s.includes('undefined'), `formatNumber(${n})="${s}" clean`);
}

// wave spawn generation across all waves + affixes
for (let w = 1; w <= MAX_WAVES; w++) {
  for (const swarm of [false, true]) {
    const spawns = buildWaveSpawns({ wave: w, isBoss: w >= 15, affixSwarm: swarm, rng: Math.random });
    ok(Array.isArray(spawns) && spawns.length > 0, `wave ${w} swarm=${swarm} has spawns`);
    ok(spawns.every((t) => typeof t === 'string'), `wave ${w} spawn types valid`);
    if (w >= 15) ok(spawns.length === 1 && spawns[0] === 'whisper', 'boss wave = single whisper');
  }
  ok(waveEnemyCount(w) === 3 + w, `enemyCount(${w})`);
  for (const d of ['easy', 'normal', 'hard']) {
    const hp = enemyHealthForWave(50, w, d);
    ok(finite(hp) && hp > 0, `health wave ${w} ${d} finite>0`);
  }
}
ok(spawnInterval(true, 10) > 0 && spawnInterval(false, 0) > 0, 'spawnInterval positive');

// computeDamage: never NaN, crit doubles, proximity/amp scale
{
  const base = computeDamage({ dps: 15, critChance: 0, proximityBuffTowers: 0, miraAmp: 1, rng: () => 0.99 });
  ok(base.damage === 15 && !base.crit, 'base damage 15 no crit');
  const crit = computeDamage({ dps: 15, critChance: 1, proximityBuffTowers: 0, miraAmp: 1, rng: () => 0 });
  ok(crit.damage === 30 && crit.crit, 'crit doubles');
  const buffed = computeDamage({ dps: 10, critChance: 0, proximityBuffTowers: 2, miraAmp: 1.5, rng: () => 0.99 });
  ok(Math.abs(buffed.damage - 10 * 1.3 * 1.5) < 1e-9, 'proximity+mira stack');
}
ok(killReward(100) === 50, 'killReward = maxHealth*0.5');

// ---------------------------------------------------------------------------
console.log('\n== bone-cast (100k rolls + pity + odds) ==');
{
  const N = 100000;
  const counts = {};
  let sincePity = 0;
  let pityHits = 0;
  let maxStreakWithoutRunePlus = 0;
  let streak = 0;
  for (let i = 0; i < N; i++) {
    const { result, pityTriggered } = rollBoneCast(sincePity);
    ok(
      (result && typeof result.rarity === 'string' && ODDS.some((o) => o.rarity === result.rarity)) || isRunePlus(result.rarity),
      `roll ${i} valid rarity`,
    );
    counts[result.rarity] = (counts[result.rarity] || 0) + 1;
    if (pityTriggered) {
      pityHits++;
      ok(isRunePlus(result.rarity), 'pity roll is Rune+');
    }
    if (isRunePlus(result.rarity)) {
      streak = 0;
      sincePity = 0;
    } else {
      streak++;
      maxStreakWithoutRunePlus = Math.max(maxStreakWithoutRunePlus, streak);
      sincePity++;
    }
  }
  // pity guarantees Rune+ at least every PITY_INTERVAL casts → streak can never reach PITY_INTERVAL
  ok(maxStreakWithoutRunePlus < PITY_INTERVAL, `pity holds: max dry streak ${maxStreakWithoutRunePlus} < ${PITY_INTERVAL}`);
  const oddsSum = ODDS.reduce((a, o) => a + o.pct, 0);
  ok(oddsSum === 100, `disclosed odds sum to 100 (got ${oddsSum})`);
  console.log('  distribution:', Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, (100 * v / N).toFixed(1) + '%'])));
}

// ---------------------------------------------------------------------------
console.log('\n== campaign sims (fuzz) ==');

function assertState(st, tag) {
  ok(finite(st.resonance) && st.resonance >= 0, `${tag}: resonance finite>=0 (${st.resonance})`);
  ok(finite(st.integrity) && st.integrity >= 0 && st.integrity <= st.maxIntegrity, `${tag}: integrity bounded (${st.integrity})`);
  ok(st.towers.length <= MAX_TOWERS, `${tag}: towers<=cap (${st.towers.length})`);
  ok(st.wave >= 0 && st.wave <= MAX_WAVES, `${tag}: wave bounded (${st.wave})`);
  ok(st.floaties.length <= 24, `${tag}: floaties bounded (${st.floaties.length})`);
  for (const e of st.enemies) {
    if (!(finite(e.health) && finite(e.pos.x) && finite(e.pos.y) && e.t >= 0)) {
      ok(false, `${tag}: enemy invariant broken ${JSON.stringify({ h: e.health, t: e.t })}`);
      break;
    }
  }
  const keys = st.towers.map((t) => `${t.pos.x.toFixed(4)},${t.pos.y.toFixed(4)}`);
  ok(new Set(keys).size === keys.length, `${tag}: no duplicate tower tiles`);
}

function simulate({ difficulty, affix, ritual, placeChance, dtGen }, tag) {
  const st = createCampaign({ difficulty, epoch: 2, affix, ritualActive: ritual, startResonance: 5000 });
  beginNextWave(st);
  let between = 0;
  let ticks = 0;
  const MAX_TICKS = 60000;
  while (st.status === 'running' && ticks < MAX_TICKS) {
    ticks++;
    const dt = dtGen();
    if (Math.random() < placeChance) {
      const type = ['corvus', 'sage', 'pip', 'mira'][Math.floor(Math.random() * 4)];
      const tile = BUILDABLE[Math.floor(Math.random() * BUILDABLE.length)];
      placeTower(st, type, tile.x + (Math.random() - 0.5) * 0.05, tile.y + (Math.random() - 0.5) * 0.05);
    }
    if (Math.random() < 0.002 && st.towers.length) sellTower(st, st.towers[0].id);
    tickCampaign(st, dt);
    if (ticks % 50 === 0) assertState(st, tag);
    if (!st.waveInProgress && st.status === 'running' && st.wave < MAX_WAVES) {
      between += dt;
      if (between > 1.4) {
        between = 0;
        beginNextWave(st);
      }
    } else between = 0;
  }
  assertState(st, tag + ':final');
  ok(st.status === 'won' || st.status === 'lost', `${tag}: terminated (status=${st.status}, ticks=${ticks})`);
  return { status: st.status, ticks, wave: st.wave };
}

const dtNormal = () => 0.1;
const dtJittery = () => Math.random() * 0.05;
const dtSpiky = () => (Math.random() < 0.1 ? 0.05 : 0.016);
const dtZeroSpike = () => (Math.random() < 0.3 ? 0 : 0.033);

let wins = 0;
let losses = 0;
const RUNS = 120;
for (let i = 0; i < RUNS; i++) {
  const difficulty = DIFFICULTIES[i % 3].id;
  const affix = i % 5 === 0 ? 'none' : ROLLABLE_AFFIXES[i % ROLLABLE_AFFIXES.length];
  const dtGen = [dtNormal, dtJittery, dtSpiky, dtZeroSpike][i % 4];
  const placeChance = [0, 0.02, 0.1, 0.3][i % 4];
  const r = simulate({ difficulty, affix, ritual: i % 2 === 0, placeChance, dtGen }, `run${i}/${difficulty}/${affix}`);
  if (r.status === 'won') wins++;
  else losses++;
}
console.log(`  ${RUNS} runs: ${wins} won, ${losses} lost, all terminated & invariant-clean`);

// placement edge cases
console.log('\n== placement edges ==');
{
  const st = createCampaign({ difficulty: 'normal', epoch: 0, affix: 'none', ritualActive: false, startResonance: 100000 });
  beginNextWave(st);
  let placed = 0;
  for (const tile of BUILDABLE) {
    if (placeTower(st, 'corvus', tile.x, tile.y)) placed++;
  }
  ok(st.towers.length <= MAX_TOWERS, `cap enforced when spamming (placed ${placed}, towers ${st.towers.length})`);
  const before = st.towers.length;
  placeTower(st, 'corvus', -5, 5);
  placeTower(st, 'mira', 99, -99);
  placeTower(st, 'pip', NaN, NaN);
  ok(st.towers.length === before, 'garbage coords do not place towers');
  const poor = createCampaign({ difficulty: 'normal', epoch: 0, affix: 'none', ritualActive: false, startResonance: 0 });
  beginNextWave(poor);
  ok(!placeTower(poor, 'mira', 0.5, 0.5), 'broke player cannot place (no negative resonance)');
  ok(poor.resonance >= 0, 'resonance never negative after failed placement');
  const r0 = poor.resonance;
  sellTower(poor, 'nonexistent');
  ok(poor.resonance === r0, 'selling invalid id is a no-op');
}

// winnability: smart play must be able to clear the campaign, else it's a balance/logic defect
console.log('\n== winnability (smart placement) ==');
{
  // rank buildable tiles by proximity to the path; the best spots can actually hit enemies
  const ranked = [...BUILDABLE]
    .map((t) => ({ t, d: Math.min(...PATH.map((p) => Math.hypot(p.x - t.x, p.y - t.y))) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.t);

  function smartRun(difficulty) {
    const st = createCampaign({ difficulty, epoch: 2, affix: 'none', ritualActive: false, startResonance: 3000 });
    beginNextWave(st);
    // opening: a couple towers near the path
    const plan = ['corvus', 'pip', 'sage', 'mira', 'corvus', 'pip', 'corvus', 'sage'];
    let placedIdx = 0;
    const tryPlace = () => {
      while (placedIdx < ranked.length && st.towers.length < MAX_TOWERS) {
        const type = plan[st.towers.length] ?? 'corvus';
        const tile = ranked[placedIdx++];
        if (placeTower(st, type, tile.x, tile.y)) return true;
      }
      return false;
    };
    tryPlace();
    tryPlace();
    let between = 0;
    let ticks = 0;
    let maxWave = 0;
    while (st.status === 'running' && ticks < 60000) {
      ticks++;
      // keep buying towers whenever we can afford one
      if (st.towers.length < MAX_TOWERS) tryPlace();
      tickCampaign(st, 0.1);
      maxWave = Math.max(maxWave, st.wave);
      if (!st.waveInProgress && st.status === 'running' && st.wave < MAX_WAVES) {
        between += 0.1;
        if (between > 1.4) { between = 0; beginNextWave(st); }
      } else between = 0;
    }
    return { status: st.status, maxWave, towers: st.towers.length };
  }

  const easy = smartRun('easy');
  const normal = smartRun('normal');
  const hard = smartRun('hard');
  console.log('  easy:', easy, '\n  normal:', normal, '\n  hard:', hard);
  ok(normal.status === 'won', `Normal is winnable with smart play (reached wave ${normal.maxWave}, ${normal.status})`);
  ok(easy.status === 'won', `Easy is winnable (${easy.status})`);
  ok(hard.maxWave >= 8, `Hard is at least deep-reachable (wave ${hard.maxWave})`);
}

// ---------------------------------------------------------------------------
console.log(`\n== RESULT: ${pass} passed, ${fail} failed ==`);
if (fail > 0) {
  console.log('\nFAILURES:');
  failures.slice(0, 40).forEach((f) => console.log('  -', f));
  process.exit(1);
}
console.log('ALL FUNCTIONAL STRESS PASSED ✓');
