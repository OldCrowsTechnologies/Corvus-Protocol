// Adversarial "thief" harness — tries to mint currency / progress the way a
// cheating player or tampered client would. Run: npm run security
import { useStore } from '../src/state/store.ts';

let pass = 0;
let fail = 0;
const holes = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    holes.push(msg);
    console.error('  ✗ EXPLOIT:', msg);
  }
}
const S = () => useStore.getState();
function reset() {
  S().resetAccount();
}

console.log('== double-claim / re-entrancy ==');
{
  reset();
  // force a quest to complete, then claim twice
  useStore.setState((s) => ({
    rituals: { ...s.rituals, quests: s.rituals.quests.map((q) => (q.id === 'clear_waves' ? { ...q, progress: q.target } : q)) },
  }));
  const before = S().account.feathers;
  S().claimQuest('clear_waves');
  const after1 = S().account.feathers;
  S().claimQuest('clear_waves');
  S().claimQuest('clear_waves');
  const after3 = S().account.feathers;
  ok(after1 - before === 15, `quest claim grants exactly its reward (got ${after1 - before})`);
  ok(after3 === after1, `double/triple claim grants nothing extra (was ${after1}, now ${after3})`);
}
{
  reset();
  useStore.setState((s) => ({ rituals: { ...s.rituals, weekly: { ...s.rituals.weekly, progress: s.rituals.weekly.target } } }));
  const before = S().account.feathers;
  S().claimWeekly();
  const a1 = S().account.feathers;
  S().claimWeekly();
  const a2 = S().account.feathers;
  ok(a1 - before === 100, 'weekly grants its reward once');
  ok(a2 === a1, 'weekly cannot be double-claimed');
}
{
  reset();
  useStore.setState({ pendingOffline: { earned: 5000, hours: 2, capped: false } });
  const before = S().account.resonance;
  const c1 = S().claimOffline();
  const mid = S().account.resonance;
  const c2 = S().claimOffline();
  const end = S().account.resonance;
  ok(c1 === 5000 && mid - before === 5000, 'offline claim banks once');
  ok(c2 === 0 && end === mid, 'second offline claim yields nothing (no double-bank)');
}

console.log('\n== negative-amount spend (mint via subtraction) ==');
{
  reset();
  const f0 = S().account.feathers;
  const rok = S().spendFeathers(-100000);
  ok(!(S().account.feathers > f0), `spendFeathers(negative) must not add feathers (was ${f0}, now ${S().account.feathers}, returned ${rok})`);
  const r0 = S().account.resonance;
  S().spendResonance(-100000);
  ok(!(S().account.resonance > r0), `spendResonance(negative) must not add resonance (was ${r0}, now ${S().account.resonance})`);
}

console.log('\n== free premium currency via rewarded ads ==');
{
  reset();
  const r0 = S().account.resonance;
  let granted = 0;
  // a thief taps "watch ad" 50 times
  for (let i = 0; i < 50; i++) {
    if (typeof S().claimAdReward === 'function') {
      if (S().claimAdReward(500)) granted++;
    }
  }
  ok(typeof S().claimAdReward === 'function', 'a capped ad-reward action exists (claimAdReward)');
  ok(granted <= 3, `rewarded ads capped per day (granted ${granted} of 50 taps)`);
  ok(S().account.resonance - r0 <= 3 * 500, `ad resonance reward capped (gained ${S().account.resonance - r0})`);
}

console.log('\n== bone-cast: no free rolls, spend is atomic ==');
{
  reset();
  // give the thief some feathers, then try to roll x10 for free
  useStore.setState((s) => ({ account: { ...s.account, feathers: 100 } }));
  const f0 = S().account.feathers;
  if (typeof S().castTen === 'function') {
    S().castTen();
    ok(S().account.feathers === f0 - 80, `castTen spends exactly 80 feathers (was ${f0}, now ${S().account.feathers})`);
    // with 20 left, a second x10 (cost 80) must fail
    const before = S().account.feathers;
    const res = S().castTen();
    ok(S().account.feathers === before, `castTen with insufficient feathers is a no-op (${before} -> ${S().account.feathers})`);
  } else {
    ok(false, 'castTen atomic action exists (no trust-the-caller free roll)');
  }
  // free cast: only one per day
  reset();
  const first = S().castFree ? S().castFree() : null;
  ok(!!first, 'free cast works once');
  const second = S().castFree ? S().castFree() : null;
  ok(second === null, 'second free cast in a day is refused');
}

console.log('\n== tampered / NaN persisted state must not crash or explode ==');
{
  reset();
  // simulate a hand-edited storage blob
  useStore.setState((s) => ({ account: { ...s.account, resonance: NaN, feathers: -999 } }));
  // sanitize hook (if present) or actions should keep the economy finite
  if (typeof S().sanitize === 'function') S().sanitize();
  const okResonance = Number.isFinite(S().account.resonance) && S().account.resonance >= 0;
  const okFeathers = Number.isFinite(S().account.feathers) && S().account.feathers >= 0;
  ok(okResonance, `resonance self-heals from NaN (now ${S().account.resonance})`);
  ok(okFeathers, `feathers self-heals from negative (now ${S().account.feathers})`);
  // spending against junk state should never throw
  let threw = false;
  try {
    S().spendResonance(10);
    S().buyRitual();
    S().doPrestige();
  } catch (e) {
    threw = true;
  }
  ok(!threw, 'actions do not throw on junk state');
}

console.log('\n== prestige integrity (feathers persist, resonance resets) ==');
{
  reset();
  useStore.setState((s) => ({ account: { ...s.account, feathers: 250, resonance: 99999, epoch: 2 } }));
  const beforeF = S().account.feathers;
  const r = S().doPrestige();
  ok(S().account.feathers === beforeF, `feathers persist through prestige (${beforeF} -> ${S().account.feathers})`);
  ok(S().account.resonance < 99999, 'resonance resets on prestige');
  ok(S().account.epoch === 3 && r.newEpoch === 3, 'epoch advances');
  ok(Object.values(S().account.characters).every((c) => c.level === 1), 'characters reset to L1');
}

console.log(`\n== RESULT: ${pass} passed, ${fail} exploit(s) open ==`);
if (fail > 0) {
  console.log('\nOPEN HOLES:');
  holes.forEach((h) => console.log('  -', h));
  process.exit(1);
}
console.log('NO OPEN EXPLOITS ✓');
