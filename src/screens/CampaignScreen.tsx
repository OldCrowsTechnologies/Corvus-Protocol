import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { buffIcon, itemArt, type BuffIconName } from '@/art';
import { playSfx, playSfxThrottled, playVoice } from '@/audio/sounds';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { FeatherPill } from '@/components/CurrencyPill';
import { ResonanceIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TutorialOverlay, type CoachStep } from '@/components/TutorialOverlay';
import { ProgressBar } from '@/components/ui';
import { AFFIXES, MAX_WAVES, ROLLABLE_AFFIXES, TOWERS } from '@/game/constants';
import {
  beginNextWave,
  canPlaceTower,
  createCampaign,
  MAX_TOWER_LEVEL,
  placeTower,
  sellTower,
  tickCampaign,
  towerDps,
  upgradeCost,
  upgradeTower,
} from '@/game/engine';
import { formatNumber } from '@/game/formulas';
import type { AffixId, CampaignState, TowerType } from '@/game/types';
import { TOWER_ORDER } from '@/game/types';
import { useStore } from '@/state/store';
import { charColors, colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';
import { CampaignBoard } from './CampaignBoard';

type Props = NativeStackScreenProps<RootStackParamList, 'Campaign'>;

const AFFIX_ICON: Record<string, BuffIconName> = {
  none: 'clock',
  swarm: 'skull',
  fog: 'down',
  frenzy: 'up',
  veil: 'shield',
};

const TUTORIAL_STEPS: CoachStep[] = [
  {
    title: 'Raise your first tower',
    body: 'Tap a tower in the palette below to arm it — CHAOS (Corvus) is a reliable opener.',
    anchor: 'palette',
    awaitAction: true,
  },
  {
    title: 'Place it on the board',
    body: 'Tap a glowing dark tile near the path. Your tower auto-attacks the Pale Chorus that wander into range.',
    anchor: 'board',
    awaitAction: true,
  },
  {
    title: 'Resonance fuels the ritual',
    body: 'This counter is Resonance — earned from kills and idle income. Spend it on more towers and rituals as the waves grow.',
    anchor: 'top',
  },
  {
    title: 'Defend the circle',
    body: 'Each enemy that reaches the altar costs Circle Integrity. Hit zero and the run ends. Survive 15 waves to face Whisper.',
    anchor: 'center',
  },
];

export function CampaignScreen({ navigation, route }: Props) {
  const difficulty = route.params?.difficulty ?? 'normal';
  const resume = route.params?.resume ?? false;

  const store = useStore;
  const account = useStore((s) => s.account);
  const ritualCount = useStore((s) => s.account.consumables.ritual);
  const tutorialDone = useStore((s) => s.tutorialDone);
  const completeTutorial = useStore((s) => s.completeTutorial);

  // -1 = tutorial off; 0..n = current coach step. Only on a fresh (non-resume) first run.
  const [tutStep, setTutStep] = useState(() => (tutorialDone || (route.params?.resume ?? false) ? -1 : 0));

  const campRef = useRef<CampaignState | null>(null);
  const xpBuffer = useRef<Partial<Record<TowerType, number>>>({});
  const runXp = useRef<Partial<Record<TowerType, number>>>({});
  const startLevels = useRef<Record<TowerType, number> | null>(null);
  const [, forceRender] = useState(0);
  const [armed, setArmed] = useState<TowerType | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);
  const bossAnnounced = useRef(false);

  // init campaign once
  if (campRef.current === null) {
    const affix: AffixId = ROLLABLE_AFFIXES[Math.floor(Math.random() * ROLLABLE_AFFIXES.length)];
    const chars = store.getState().account.characters;
    const st = createCampaign({
      difficulty,
      epoch: account.epoch,
      affix,
      ritualActive: ritualCount > 0,
      startResonance: account.resonance,
      charLevels: {
        corvus: chars.corvus.level,
        sage: chars.sage.level,
        pip: chars.pip.level,
        mira: chars.mira.level,
      },
    });
    if (resume && route.params && 'difficulty' in route.params) {
      const last = store.getState().lastCampaign;
      if (last) st.wave = Math.max(0, last.wave - 1);
    }
    startLevels.current = { ...st.charLevels };
    beginNextWave(st);
    campRef.current = st;
  }

  const flushXp = useCallback(() => {
    const buf = xpBuffer.current;
    if (Object.keys(buf).length > 0) {
      store.getState().grantXp(buf);
      xpBuffer.current = {};
    }
  }, [store]);

  const endRun = useCallback(
    (won: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const st = campRef.current!;
      flushXp();
      store.getState().setResonance(st.resonance);
      // consume a ritual if it was active
      if (st.ritualActive && account.consumables.ritual > 0) {
        useStore.setState((s) => ({
          account: { ...s.account, consumables: { ritual: Math.max(0, s.account.consumables.ritual - 1) } },
        }));
      }
      store.getState().setLastCampaign({ difficulty, wave: st.wave, active: !won });
      store.getState().markSeen();

      // results detail: total XP earned + any level-ups this run
      const totalXp = (Object.values(runXp.current) as number[]).reduce((a, b) => a + b, 0);
      const newChars = store.getState().account.characters;
      const start = startLevels.current;
      const levelUps = start
        ? (Object.keys(newChars) as TowerType[])
            .filter((k) => newChars[k].level > (start[k] ?? 1))
            .map((k) => `${k[0].toUpperCase()}${k.slice(1)} → L${newChars[k].level}`)
        : [];
      const progress =
        `\nXP earned: ${Math.round(totalXp)}` + (levelUps.length ? `\nLevel-ups: ${levelUps.join(', ')}` : '');

      playSfx(won ? 'win' : 'lose');
      if (won) playVoice('sage', 'campaign_won');

      if (won) {
        Alert.alert(
          'Campaign Cleared',
          `Whisper is silenced.\n\nResonance banked: ${formatNumber(st.resonance)}\nWave reached: ${st.wave}/${MAX_WAVES}${progress}`,
          [
            { text: 'Prestige', onPress: () => navigation.replace('Prestige') },
            { text: 'Main Menu', onPress: () => navigation.replace('MainMenu') },
          ],
        );
      } else {
        Alert.alert(
          'The Circle Breaks',
          `The Pale Chorus overwhelms the altar at wave ${st.wave}.\n\nResonance banked: ${formatNumber(st.resonance)}${progress}`,
          [
            { text: 'Retry Run', onPress: () => navigation.replace('Campaign', { difficulty }) },
            { text: 'Main Menu', onPress: () => navigation.replace('MainMenu') },
          ],
        );
      }
    },
    [account.consumables.ritual, difficulty, flushXp, navigation, store],
  );

  // game loop
  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    let acc = 0;
    let betweenTimer = 0;

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const st = campRef.current;
      if (!st) return;
      if (last === null) last = t;
      let dt = (t - last) / 1000;
      last = t;
      dt = Math.min(dt, 0.05);

      if (!pausedRef.current && st.status === 'running') {
        const ev = tickCampaign(st, dt * speedRef.current);
        if (ev.kills) {
          mergeXp(xpBuffer.current, ev.xp);
          mergeXp(runXp.current, ev.xp);
          playSfxThrottled('death', 90);
        }
        if (ev.crit) {
          playSfxThrottled('crit', 140);
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        }
        // boss arrival sting (once)
        if (!bossAnnounced.current && st.enemies.some((e) => e.type === 'whisper')) {
          bossAnnounced.current = true;
          playSfx('boss');
          playVoice('corvus', 'boss_spawn');
        }
        if (ev.waveCleared != null) {
          store.getState().recordWaveCleared(1);
          flushXp();
          playSfx('waveclear');
          playVoice('corvus', 'wave_clear');
          if (ev.bossDefeated) store.getState().recordBossDefeated();
        }
        if (ev.won) {
          endRun(true);
        } else if (ev.lost) {
          endRun(false);
        }

        // auto-advance between waves after a short breather
        if (!st.waveInProgress && st.status === 'running' && st.wave < MAX_WAVES) {
          betweenTimer += dt;
          if (betweenTimer > 1.4) {
            betweenTimer = 0;
            beginNextWave(st);
          }
        } else {
          betweenTimer = 0;
        }
      }

      // ~30fps UI refresh
      acc += dt;
      if (acc >= 0.033) {
        acc = 0;
        forceRender((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endRun, flushXp, store]);

  const st = campRef.current!;

  // tutorial: step 0 (arm) advances when a tower is armed
  useEffect(() => {
    if (tutStep === 0 && armed) setTutStep(1);
  }, [armed, tutStep]);

  const advanceTutorial = () => {
    setTutStep((s) => {
      if (s >= TUTORIAL_STEPS.length - 1) {
        completeTutorial();
        return -1;
      }
      return s + 1;
    });
  };
  const skipTutorial = () => {
    completeTutorial();
    setTutStep(-1);
  };

  const tapBoard = (nx: number, ny: number) => {
    if (armed) {
      const ok = placeTower(st, armed, nx, ny);
      if (ok) {
        store.getState().recordTowerPlaced();
        playSfx('place');
        playVoice(armed, 'tower_placed');
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (tutStep === 1) setTutStep(2); // step 1 (place) advances on a successful placement
        forceRender((n) => n + 1);
      } else {
        Alert.alert('Cannot place', canPlaceTower(st, armed) ? 'Tap an empty glowing pad near the path.' : 'Not enough Resonance or tower cap reached.');
      }
      return;
    }
    // not arming → select the nearest placed tower to inspect / upgrade
    let nearest: string | null = null;
    let best = 0.1;
    for (const tw of st.towers) {
      const d = Math.hypot(tw.pos.x - nx, tw.pos.y - ny);
      if (d < best) { best = d; nearest = tw.id; }
    }
    setSelected(nearest);
    if (nearest) playSfx('click');
  };

  const doUpgrade = () => {
    if (!selected) return;
    if (upgradeTower(st, selected)) {
      playSfx('place');
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      forceRender((n) => n + 1);
    } else {
      Alert.alert('Cannot upgrade', 'Not enough Resonance, or the tower is already at max level.');
    }
  };
  const doSell = () => {
    if (!selected) return;
    sellTower(st, selected);
    setSelected(null);
    playSfx('click');
    forceRender((n) => n + 1);
  };

  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1;
    setSpeed(next);
    speedRef.current = next;
  };
  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
  };

  const affix = AFFIXES[st.affix];
  const boss = st.wave >= MAX_WAVES;
  const bossEnemy = st.enemies.find((e) => e.type === 'whisper');

  return (
    <Screen bg="campaign" edges={['top']}>
      {/* character chips */}
      <View style={styles.chips}>
        {TOWER_ORDER.map((id) => {
          const cc = charColors[id];
          const prog = account.characters[id];
          return (
            <View key={id} style={[styles.chip, { backgroundColor: cc.glow + '0.12)', borderColor: cc.glow + '0.4)' }]}>
              <CharacterAvatar id={id} size={22} borderWidth={1} />
              <T variant="mono" size={8} color={cc.soft} spacing={0.4} style={{ marginTop: 2 }}>
                {id.toUpperCase()}
              </T>
              <T variant="monoBold" size={11}>
                L{prog.level}
              </T>
              <View style={{ width: '100%', marginTop: 3 }}>
                <ProgressBar pct={prog.xp / prog.xpMax} color={cc.main} track={cc.glow + '0.15)'} height={3} />
              </View>
            </View>
          );
        })}
      </View>

      {/* wave / boss banner */}
      <View style={styles.banner}>
        <View style={styles.between}>
          <T variant="display" size={14} spacing={0.6}>
            WAVE {st.wave}/{MAX_WAVES}
          </T>
          <T variant="mono" size={10} color={boss ? colors.purpleSoft : colors.textMute} spacing={1}>
            {boss ? `WHISPER · PHASE ${bossEnemy?.bossPhase ?? 1}` : st.waveInProgress ? 'IN PROGRESS' : 'NEXT WAVE…'}
          </T>
        </View>
        {boss && bossEnemy ? (
          <View style={{ marginTop: 6 }}>
            <ProgressBar pct={bossEnemy.health / bossEnemy.maxHealth} colors={[colors.purple, colors.purpleLight]} height={7} />
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            <ProgressBar pct={st.integrity / st.maxIntegrity} color="#e08a8a" track="#2a1414" height={7} />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
          {st.affix !== 'none' ? <Image source={buffIcon[AFFIX_ICON[st.affix]]} style={{ width: 14, height: 14, resizeMode: 'contain' }} /> : null}
          <T variant="mono" size={8} color={st.affix === 'none' ? colors.textFaint : '#c9a5e0'} spacing={0.6}>
            {st.affix === 'none' ? `◆ CIRCLE INTEGRITY ${st.integrity}/${st.maxIntegrity}` : `AFFIX: ${affix.label} — ${affix.blurb}`}
          </T>
        </View>
      </View>

      {/* board */}
      <CampaignBoard state={st} armed={armed} selected={selected} onTapBoard={tapBoard} />

      {/* tower palette */}
      <View style={styles.palette}>
        {TOWER_ORDER.map((id) => {
          const def = TOWERS[id];
          const cc = charColors[id];
          const afford = st.resonance >= def.cost;
          const active = armed === id;
          return (
            <Pressable
              key={id}
              onPress={() => { setSelected(null); setArmed(active ? null : id); }}
              style={[
                styles.card,
                { backgroundColor: cc.glow + '0.12)', borderColor: active ? cc.main : cc.glow + '0.4)', opacity: afford ? 1 : 0.5 },
                active && { shadowColor: cc.main, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
              ]}
            >
              <CharacterAvatar id={id} size={26} borderWidth={1} />
              <T variant="mono" size={8} color={cc.soft} spacing={0.4} style={{ marginTop: 4 }}>
                {def.role}
              </T>
              <T variant="monoBold" size={11} color={colors.goldLight}>
                {def.cost}
              </T>
            </Pressable>
          );
        })}
        <View style={[styles.card, styles.itemCard]}>
          <Image source={itemArt.ritual} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
          <T variant="mono" size={9} color={st.ritualActive ? colors.goldLight : colors.textMute} style={{ marginTop: 2 }}>
            {st.ritualActive ? '+50%' : `×${ritualCount}`}
          </T>
        </View>
      </View>

      {/* resonance bar + controls */}
      <View style={styles.controls}>
        <View style={styles.resPill}>
          <ResonanceIcon size={13} />
          <T variant="monoBold" size={13} color={colors.goldLight}>
            {formatNumber(st.resonance)}
          </T>
          <T variant="mono" size={10} color="#8a7a3f">
            +{Math.round(st.resonancePerSecond)}/s
          </T>
        </View>
        <FeatherPill amount={account.feathers} />
        <Pressable onPress={toggleSpeed} style={[styles.ctrlBtn, speed === 2 && { borderColor: colors.goldLight, backgroundColor: 'rgba(184,146,42,.15)' }]}>
          <T variant="monoBold" size={12} color={speed === 2 ? colors.goldLight : colors.tealSoft}>
            {speed}×
          </T>
        </Pressable>
        <Pressable onPress={togglePause} style={styles.ctrlBtn}>
          <T variant="mono" size={13} color={colors.tealSoft}>
            {paused ? '▶' : '❚❚'}
          </T>
        </Pressable>
        <Pressable onPress={() => { endRun(false); }} style={styles.ctrlBtn}>
          <T variant="mono" size={12} color={colors.textMute}>
            ✕
          </T>
        </Pressable>
      </View>

      {(() => {
        const tw = selected ? st.towers.find((x) => x.id === selected) : null;
        if (!tw) return null;
        const def = TOWERS[tw.type];
        const cc = charColors[tw.type];
        const maxed = tw.level >= MAX_TOWER_LEVEL;
        const cost = upgradeCost(tw.type, tw.level);
        const afford = st.resonance >= cost;
        return (
          <View style={[styles.upgrade, { borderColor: cc.main }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CharacterAvatar id={tw.type} size={38} borderWidth={1.5} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T variant="display" size={14} color={colors.paper}>{def.name}</T>
                  <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                    <T variant="mono" size={13} color={colors.textMute}>✕</T>
                  </Pressable>
                </View>
                <T variant="mono" size={9} color={cc.soft} spacing={0.6}>
                  {def.role} · LVL {tw.level}/{MAX_TOWER_LEVEL} · DPS {Math.round(towerDps(tw.type, tw.level) / 0.55)} · {tw.kills} kills
                </T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={doUpgrade}
                disabled={maxed}
                style={[styles.upBtn, { borderColor: cc.main, backgroundColor: cc.glow + (maxed ? '0.06)' : afford ? '0.2)' : '0.1)'), opacity: maxed ? 0.5 : 1 }]}
              >
                {maxed ? (
                  <T variant="monoBold" size={12} color={cc.soft}>MAX LEVEL</T>
                ) : (
                  <>
                    <T variant="monoBold" size={12} color={afford ? colors.paper : colors.textMute}>UPGRADE → L{tw.level + 1}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <ResonanceIcon size={11} />
                      <T variant="mono" size={11} color={afford ? colors.goldLight : '#a06a6a'}>{formatNumber(cost)}</T>
                    </View>
                  </>
                )}
              </Pressable>
              <Pressable onPress={doSell} style={styles.sellBtn}>
                <T variant="monoBold" size={11} color="#e0987f">SELL</T>
                <T variant="mono" size={9} color={colors.textMute} style={{ marginTop: 2 }}>refund</T>
              </Pressable>
            </View>
          </View>
        );
      })()}

      {paused ? (
        <Pressable onPress={togglePause} style={styles.pauseOverlay}>
          <T variant="display" size={24} spacing={2} glow="rgba(0,194,199,.4)">
            PAUSED
          </T>
          <T variant="mono" size={11} color={colors.textMute} style={{ marginTop: 8 }}>
            tap to resume
          </T>
        </Pressable>
      ) : null}

      {tutStep >= 0 && tutStep < TUTORIAL_STEPS.length ? (
        <TutorialOverlay
          step={TUTORIAL_STEPS[tutStep]}
          index={tutStep}
          total={TUTORIAL_STEPS.length}
          onNext={advanceTutorial}
          onSkip={skipTutorial}
        />
      ) : null}
    </Screen>
  );
}

function mergeXp(buf: Partial<Record<TowerType, number>>, add: Partial<Record<TowerType, number>>) {
  (Object.keys(add) as TowerType[]).forEach((k) => {
    buf[k] = (buf[k] ?? 0) + (add[k] ?? 0);
  });
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingTop: 6 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 11, borderWidth: 1 },
  banner: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(107,79,160,.16)',
    borderWidth: 1,
    borderColor: 'rgba(107,79,160,.4)',
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  palette: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, marginTop: 12 },
  card: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.md, borderWidth: 1 },
  itemCard: { backgroundColor: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.18)', borderStyle: 'dashed', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 'auto', paddingTop: 12, paddingBottom: 12 },
  resPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: 'rgba(184,146,42,.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,146,42,.35)',
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,194,199,.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,10,.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgrade: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 74,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10,14,20,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  upBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  sellBtn: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(192,90,63,0.5)',
    backgroundColor: 'rgba(192,90,63,0.12)',
  },
});
