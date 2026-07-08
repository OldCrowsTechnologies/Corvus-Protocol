// Smoke test: confirm the headless harness can import the game logic.
import { prestigeMultiplier, offlineResonance, formatNumber } from '../src/game/formulas.ts';
import { rollBoneCast } from '../src/game/boneCast.ts';
import { createCampaign, beginNextWave, tickCampaign, placeTower } from '../src/game/engine.ts';

console.log('prestigeMultiplier(3) =', prestigeMultiplier(3), '(expect 3.375)');
console.log('formatNumber(45320) =', formatNumber(45320));
console.log('offline 3h normal =', offlineResonance({ epoch: 0, secondsElapsed: 10800, conveniencePass: false }));
console.log('boneCast roll =', rollBoneCast(0).result.rarity);

const st = createCampaign({ difficulty: 'normal', epoch: 0, affix: 'none', ritualActive: false, startResonance: 1000 });
beginNextWave(st);
placeTower(st, 'corvus', 0.5, 0.9);
for (let i = 0; i < 200; i++) tickCampaign(st, 0.1);
console.log('after 200 ticks: wave', st.wave, 'enemies', st.enemies.length, 'resonance', Math.round(st.resonance), 'integrity', st.integrity);
console.log('SMOKE OK');
