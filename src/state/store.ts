import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { rollBoneCast, isRunePlus, CAST_X10_COST } from '@/game/boneCast';
import { prestigeMultiplier } from '@/game/formulas';
import { offlineResonance } from '@/game/formulas';
import type {
  Account,
  BoneCastResult,
  DailyRituals,
  Difficulty,
  Settings,
  TowerType,
} from '@/game/types';

const RITUAL_COST = 500;

interface CastState {
  boneCast: { freeCastsRemaining: number; castsSincePity: number; lastResult: BoneCastResult | null };
  account: Account;
}

/** Roll one Bone-Cast against the given state and apply its reward. Pure — returns the next state. */
function rollAndApply(state: CastState): CastState & { result: BoneCastResult } {
  const { result } = rollBoneCast(state.boneCast.castsSincePity);
  const nextSincePity = isRunePlus(result.rarity) ? 0 : state.boneCast.castsSincePity + 1;
  const runes = [...state.account.runes];
  const skins = [...state.account.cosmetics.skins];
  let feathersDelta = 0;
  if (result.rarity === 'feathers') feathersDelta = 25;
  if (result.rarity === 'rune') runes.push(result.label);
  if (result.rarity === 'cosmetic') skins.push(result.label);
  return {
    boneCast: { ...state.boneCast, castsSincePity: nextSincePity, lastResult: result },
    account: {
      ...state.account,
      feathers: state.account.feathers + feathersDelta,
      runes,
      cosmetics: { ...state.account.cosmetics, skins: Array.from(new Set(skins)) },
    },
    result,
  };
}

function dayNumber(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

function defaultQuests(): DailyRituals['quests'] {
  return [
    { id: 'clear_waves', label: 'Clear 3 waves', progress: 0, target: 3, reward: 15, claimed: false },
    { id: 'place_towers', label: 'Place 5 towers', progress: 0, target: 5, reward: 10, claimed: false },
    {
      id: 'watch_ad',
      label: 'Watch 1 rewarded ad',
      progress: 0,
      target: 1,
      reward: 10,
      bonusResonance: 500,
      isAd: true,
      claimed: false,
    },
  ];
}

function defaultRituals(): DailyRituals {
  return {
    streakDay: 1,
    lastClaimDayIndex: dayNumber(),
    quests: defaultQuests(),
    weekly: {
      id: 'whisper_x3',
      label: 'Defeat Whisper 3 times',
      progress: 0,
      target: 3,
      reward: 100,
      claimed: false,
    },
  };
}

function defaultAccount(): Account {
  return {
    uid: 'guest_' + Math.floor(Date.now() % 1_000_000).toString(36),
    epoch: 0,
    prestigeMultiplier: prestigeMultiplier(0),
    resonance: 350, // starting stipend — enough to raise a first tower
    feathers: 0,
    characters: {
      corvus: { level: 1, xp: 0, xpMax: 500 },
      sage: { level: 1, xp: 0, xpMax: 500 },
      pip: { level: 1, xp: 0, xpMax: 500 },
      mira: { level: 1, xp: 0, xpMax: 500 },
    },
    cosmetics: { skins: ['corvus_base'], familiars: [], equippedSkin: 'corvus_base' },
    consumables: { ritual: 0 },
    runes: [],
    subscription: { conveniencePassActive: false },
    adMetrics: { todayWatched: 0 },
    offline: { lastSeenAt: Date.now() },
    rosaUnlocked: false,
  };
}

const EPOCH_COSMETICS = [
  'corvus_plague',
  'sage_oracle',
  'pip_gilded',
  'mira_eclipse',
  'altar_violet',
];

export interface LastCampaign {
  difficulty: Difficulty;
  wave: number;
  active: boolean; // true if a run is resumable
}

export interface OfflineClaim {
  earned: number;
  hours: number;
  capped: boolean;
}

interface GameStore {
  account: Account;
  settings: Settings;
  rituals: DailyRituals;
  boneCast: { freeCastsRemaining: number; castsSincePity: number; lastResult: BoneCastResult | null };
  lastCampaign: LastCampaign | null;
  pendingOffline: OfflineClaim | null;
  tutorialDone: boolean;

  // lifecycle
  hydrateDaily: () => void;
  computeOffline: () => void;
  markSeen: () => void;
  completeTutorial: () => void;

  // economy
  setResonance: (n: number) => void; // bank the current run pool
  addResonance: (n: number) => void;
  spendResonance: (n: number) => boolean;
  addFeathers: (n: number) => void;
  spendFeathers: (n: number) => boolean;
  grantXp: (xp: Partial<Record<TowerType, number>>) => void;

  // campaign bookkeeping
  setLastCampaign: (c: LastCampaign) => void;
  clearActiveCampaign: () => void;
  recordWaveCleared: (count: number) => void;
  recordTowerPlaced: () => void;
  recordBossDefeated: () => void;

  // prestige
  doPrestige: () => { newEpoch: number; newMultiplier: number; cosmetic: string };

  // shop
  buyRitual: () => boolean;
  purchasePass: () => void;
  cancelPass: () => void;

  // bone-cast (atomic — no trust-the-caller free rolls)
  castFree: () => BoneCastResult | null;
  castTen: () => BoneCastResult | null;

  // daily
  claimQuest: (id: string) => void;
  claimWeekly: () => void;
  claimAdReward: (resonance: number) => boolean;

  // settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetAccount: () => void;
  claimOffline: () => number;
  sanitize: () => void;
}

/** Ceiling on rewarded ads per day (spec: 3 per session). Kills infinite-reward taps. */
const AD_DAILY_CAP = 3;

const posInt = (n: number, fallback = 0) => (Number.isFinite(n) && n >= 0 ? n : fallback);

/** Clamp a persisted account back into a sane, finite, non-negative shape. */
function sanitizeAccount(a: Account): Account {
  const chars = { ...a.characters };
  (Object.keys(chars) as TowerType[]).forEach((k) => {
    const c = chars[k] ?? { level: 1, xp: 0, xpMax: 500 };
    chars[k] = {
      level: Math.min(10, Math.max(1, Math.floor(posInt(c.level, 1)) || 1)),
      xp: posInt(c.xp, 0),
      xpMax: posInt(c.xpMax, 500) || 500,
    };
  });
  return {
    ...a,
    epoch: Math.max(0, Math.floor(posInt(a.epoch, 0))),
    prestigeMultiplier: Number.isFinite(a.prestigeMultiplier) ? a.prestigeMultiplier : prestigeMultiplier(0),
    resonance: posInt(a.resonance, 0),
    feathers: posInt(a.feathers, 0),
    characters: chars,
    consumables: { ritual: Math.min(10, Math.max(0, Math.floor(posInt(a.consumables?.ritual, 0)))) },
    adMetrics: { todayWatched: Math.max(0, Math.floor(posInt(a.adMetrics?.todayWatched, 0))) },
  };
}

function levelUp(char: { level: number; xp: number; xpMax: number }, gained: number) {
  char.xp += gained;
  while (char.xp >= char.xpMax && char.level < 10) {
    char.xp -= char.xpMax;
    char.level += 1;
  }
  if (char.level >= 10) char.xp = Math.min(char.xp, char.xpMax);
}

export const useStore = create<GameStore>()(
  persist(
    (set, get) => ({
      account: defaultAccount(),
      settings: { music: true, sfx: true, voice: true, graphics: 'high', debugMetrics: false },
      rituals: defaultRituals(),
      boneCast: { freeCastsRemaining: 1, castsSincePity: 0, lastResult: null },
      lastCampaign: null,
      pendingOffline: null,
      tutorialDone: false,

      completeTutorial: () => set({ tutorialDone: true }),

      hydrateDaily: () => {
        const today = dayNumber();
        const r = get().rituals;
        if (r.lastClaimDayIndex !== today) {
          const consecutive = today - r.lastClaimDayIndex === 1;
          set((s) => ({
            rituals: {
              ...r,
              streakDay: consecutive ? Math.min(7, r.streakDay + 1) : 1,
              lastClaimDayIndex: today,
              quests: defaultQuests(),
            },
            boneCast: { ...s.boneCast, freeCastsRemaining: 1 },
            account: { ...s.account, adMetrics: { todayWatched: 0 } },
          }));
        }
      },

      computeOffline: () => {
        const s = get();
        const secs = Math.max(0, (Date.now() - s.account.offline.lastSeenAt) / 1000);
        if (secs < 60) {
          set({ pendingOffline: null });
          return;
        }
        const res = offlineResonance({
          epoch: s.account.epoch,
          secondsElapsed: secs,
          conveniencePass: s.account.subscription.conveniencePassActive,
        });
        set({ pendingOffline: res });
      },

      markSeen: () =>
        set((s) => ({ account: { ...s.account, offline: { lastSeenAt: Date.now() } } })),

      setResonance: (n) =>
        set((s) => ({ account: { ...s.account, resonance: Number.isFinite(n) ? Math.max(0, Math.round(n)) : s.account.resonance } })),

      addResonance: (n) => {
        if (!Number.isFinite(n) || n <= 0) return; // grants are positive only
        set((s) => ({ account: { ...s.account, resonance: Math.max(0, s.account.resonance + n) } }));
      },

      spendResonance: (n) => {
        // Reject non-positive spends — a negative "spend" would mint currency.
        if (!Number.isFinite(n) || n <= 0) return false;
        if (get().account.resonance < n) return false;
        set((s) => ({ account: { ...s.account, resonance: s.account.resonance - n } }));
        return true;
      },

      addFeathers: (n) => {
        if (!Number.isFinite(n) || n <= 0) return; // grants are positive only
        set((s) => ({ account: { ...s.account, feathers: s.account.feathers + n } }));
      },

      spendFeathers: (n) => {
        // Reject non-positive spends — a negative "spend" would mint feathers.
        if (!Number.isFinite(n) || n <= 0) return false;
        if (get().account.feathers < n) return false;
        set((s) => ({ account: { ...s.account, feathers: s.account.feathers - n } }));
        return true;
      },

      grantXp: (xp) =>
        set((s) => {
          const chars = { ...s.account.characters };
          (Object.keys(xp) as TowerType[]).forEach((k) => {
            const c = { ...chars[k] };
            levelUp(c, xp[k] ?? 0);
            chars[k] = c;
          });
          return { account: { ...s.account, characters: chars } };
        }),

      setLastCampaign: (c) => set({ lastCampaign: c }),
      clearActiveCampaign: () =>
        set((s) => ({ lastCampaign: s.lastCampaign ? { ...s.lastCampaign, active: false } : null })),

      recordWaveCleared: (count) =>
        set((s) => ({ rituals: bumpQuest(s.rituals, 'clear_waves', count) })),
      recordTowerPlaced: () => set((s) => ({ rituals: bumpQuest(s.rituals, 'place_towers', 1) })),
      recordBossDefeated: () =>
        set((s) => {
          const weekly = { ...s.rituals.weekly };
          if (!weekly.claimed) weekly.progress = Math.min(weekly.target, weekly.progress + 1);
          return { rituals: { ...s.rituals, weekly } };
        }),

      doPrestige: () => {
        const s = get();
        const newEpoch = s.account.epoch + 1;
        const newMultiplier = prestigeMultiplier(newEpoch);
        const cosmetic = EPOCH_COSMETICS[(newEpoch - 1) % EPOCH_COSMETICS.length];
        const chars = { ...s.account.characters };
        (Object.keys(chars) as TowerType[]).forEach((k) => {
          chars[k] = { level: 1, xp: 0, xpMax: 500 };
        });
        set({
          account: {
            ...s.account,
            epoch: newEpoch,
            prestigeMultiplier: newMultiplier,
            resonance: 350, // Resonance resets on prestige (feathers do not)
            characters: chars,
            cosmetics: {
              ...s.account.cosmetics,
              skins: Array.from(new Set([...s.account.cosmetics.skins, cosmetic])),
            },
            // feathers persist through prestige (premium currency)
          },
          lastCampaign: null,
        });
        return { newEpoch, newMultiplier, cosmetic };
      },

      buyRitual: () => {
        const s = get();
        if (s.account.resonance < RITUAL_COST || s.account.consumables.ritual >= 10) return false;
        set({
          account: {
            ...s.account,
            resonance: s.account.resonance - RITUAL_COST,
            consumables: { ritual: s.account.consumables.ritual + 1 },
          },
        });
        return true;
      },

      purchasePass: () =>
        set((s) => ({
          account: { ...s.account, subscription: { conveniencePassActive: true } },
        })),
      cancelPass: () =>
        set((s) => ({
          account: { ...s.account, subscription: { conveniencePassActive: false } },
        })),

      castFree: () => {
        const s = get();
        if (s.boneCast.freeCastsRemaining <= 0) return null; // one free cast per day
        const next = rollAndApply({ boneCast: s.boneCast, account: s.account });
        set({
          boneCast: { ...next.boneCast, freeCastsRemaining: s.boneCast.freeCastsRemaining - 1 },
          account: next.account,
        });
        return next.result;
      },

      castTen: () => {
        const s = get();
        // Spend is atomic and internal — there is no free ×10 path for a tampered client to call.
        if (s.account.feathers < CAST_X10_COST) return null;
        let cur: CastState = {
          boneCast: s.boneCast,
          account: { ...s.account, feathers: s.account.feathers - CAST_X10_COST },
        };
        let last: BoneCastResult | null = null;
        const rank = { common: 0, uncommon: 1, rare: 2, legendary: 3 } as const;
        for (let i = 0; i < 10; i++) {
          const next = rollAndApply(cur);
          cur = { boneCast: next.boneCast, account: next.account };
          if (!last || rank[next.result.tier] >= rank[last.tier]) last = next.result;
        }
        set({ boneCast: cur.boneCast, account: cur.account });
        return last;
      },

      claimQuest: (id) =>
        set((s) => {
          const quests = s.rituals.quests.map((q) => ({ ...q }));
          const q = quests.find((x) => x.id === id);
          if (!q || q.claimed || q.progress < q.target) return {};
          q.claimed = true;
          return {
            rituals: { ...s.rituals, quests },
            account: { ...s.account, feathers: s.account.feathers + q.reward },
          };
        }),

      claimWeekly: () =>
        set((s) => {
          const weekly = { ...s.rituals.weekly };
          if (weekly.claimed || weekly.progress < weekly.target) return {};
          weekly.claimed = true;
          return {
            rituals: { ...s.rituals, weekly },
            account: { ...s.account, feathers: s.account.feathers + weekly.reward },
          };
        }),

      // Single choke-point for rewarded ads: enforces the daily cap so the reward
      // can't be farmed by tapping "watch" repeatedly. Returns whether a reward was granted.
      claimAdReward: (resonance) => {
        const s = get();
        if (s.account.adMetrics.todayWatched >= AD_DAILY_CAP) return false;
        const grant = Number.isFinite(resonance) && resonance > 0 ? resonance : 0;
        const quests = s.rituals.quests.map((q) => ({ ...q }));
        const q = quests.find((x) => x.id === 'watch_ad');
        if (q) q.progress = Math.min(q.target, q.progress + 1);
        set({
          rituals: { ...s.rituals, quests },
          account: {
            ...s.account,
            resonance: s.account.resonance + grant,
            adMetrics: { todayWatched: s.account.adMetrics.todayWatched + 1 },
          },
        });
        return true;
      },

      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),

      resetAccount: () =>
        set({
          account: defaultAccount(),
          rituals: defaultRituals(),
          boneCast: { freeCastsRemaining: 1, castsSincePity: 0, lastResult: null },
          lastCampaign: null,
          pendingOffline: null,
          tutorialDone: false,
        }),

      claimOffline: () => {
        const claim = get().pendingOffline;
        const earned = claim?.earned ?? 0;
        set((s) => ({
          pendingOffline: null,
          account: {
            ...s.account,
            resonance: s.account.resonance + earned,
            offline: { lastSeenAt: Date.now() },
          },
        }));
        return earned;
      },

      // Re-clamp the account to a sane, finite shape (defends against hand-edited storage).
      sanitize: () => set((s) => ({ account: sanitizeAccount(s.account) })),
    }),
    {
      name: 'corvus-protocol-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        account: s.account,
        settings: s.settings,
        rituals: s.rituals,
        boneCast: s.boneCast,
        lastCampaign: s.lastCampaign,
        tutorialDone: s.tutorialDone,
      }),
      // Any persisted blob (incl. tampered ones) is clamped back to sanity on load.
      onRehydrateStorage: () => (state) => {
        if (state?.account) state.account = sanitizeAccount(state.account);
      },
    },
  ),
);

function bumpQuest(rituals: DailyRituals, id: string, by: number): DailyRituals {
  const quests = rituals.quests.map((q) => ({ ...q }));
  const q = quests.find((x) => x.id === id);
  if (q && !q.claimed) q.progress = Math.min(q.target, q.progress + by);
  return { ...rituals, quests };
}
