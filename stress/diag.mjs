// One-off diagnostic: watch a smart Normal run wave-by-wave.
import { createCampaign, beginNextWave, tickCampaign, placeTower } from '../src/game/engine.ts';
import { MAX_TOWERS, MAX_WAVES, TOWERS, ENEMIES } from '../src/game/constants.ts';
import { BUILDABLE, PATH, PATH_LENGTH } from '../src/game/board.ts';
import { enemyHealthForWave } from '../src/game/formulas.ts';

console.log('PATH_LENGTH (normalized):', PATH_LENGTH.toFixed(3));
console.log('tower effective dps (per 0.9s shot):');
for (const k of ['corvus', 'sage', 'pip', 'mira']) console.log(' ', k, 'dps', TOWERS[k].dps, 'range', TOWERS[k].range, 'normRange', (TOWERS[k].range / 1080).toFixed(3), '=> eff', (TOWERS[k].dps / 0.9).toFixed(1));
console.log('enemy cross time (s) = 1/speed:');
for (const k of ['wisp', 'wailer', 'shrieker', 'husk', 'whisper']) console.log(' ', k, 'hp', ENEMIES[k].baseHealth, 'speed', ENEMIES[k].speed, '=> cross', (1 / ENEMIES[k].speed).toFixed(1) + 's');

const ranked = [...BUILDABLE]
  .map((t) => ({ t, d: Math.min(...PATH.map((p) => Math.hypot(p.x - t.x, p.y - t.y))) }))
  .sort((a, b) => a.d - b.d);
console.log('\nnearest buildable tiles to path (dist):', ranked.slice(0, 8).map((x) => x.d.toFixed(3)).join(', '));

const st = createCampaign({ difficulty: 'normal', epoch: 2, affix: 'none', ritualActive: false, startResonance: 3000 });
beginNextWave(st);
const plan = ['corvus', 'pip', 'sage', 'mira', 'corvus', 'pip', 'corvus', 'sage'];
let idx = 0;
const tryPlace = () => {
  while (idx < ranked.length && st.towers.length < MAX_TOWERS) {
    if (placeTower(st, plan[st.towers.length] ?? 'corvus', ranked[idx].t.x, ranked[idx].t.y)) { idx++; return true; }
    idx++;
  }
  return false;
};
while (st.towers.length < MAX_TOWERS && tryPlace()) {}
console.log('placed towers:', st.towers.length, 'spent, resonance now', Math.round(st.resonance));

let between = 0, ticks = 0, wave = 0, leaked = 0, lastIntegrity = st.integrity;
while (st.status === 'running' && ticks < 60000) {
  ticks++;
  tickCampaign(st, 0.1);
  if (st.leaked !== leaked) { leaked = st.leaked; }
  if (st.wave !== wave) { wave = st.wave; console.log(`  wave ${wave} start · integrity ${st.integrity} · resonance ${Math.round(st.resonance)} · enemies alive ${st.enemies.length}`); }
  if (st.integrity !== lastIntegrity) { lastIntegrity = st.integrity; }
  if (!st.waveInProgress && st.status === 'running' && st.wave < MAX_WAVES) { between += 0.1; if (between > 1.4) { between = 0; beginNextWave(st); } } else between = 0;
}
console.log(`\nFINAL: ${st.status} at wave ${st.wave}, integrity ${st.integrity}, total leaked ${st.leaked}, ticks ${ticks}`);
