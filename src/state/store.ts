import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { rollBoneCast, isRunePlus } from '@/game/boneCast';
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

  // lifecycle
  hydrateDaily: () => void;
  computeOffline: () => void;
  markSeen: () => void;

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

  // bone-cast
  doBoneCast: (useFeathers: boolean) => BoneCastResult | null;

  // daily
  claimQuest: (id: string) => void;
  claimWeekly: () => void;
  watchAdQuest: () => void;

  // settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetAccount: () => void;
  claimOffline: () => number;
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
      settings: { sfx: true, voice: true, graphics: 'high', debugMetrics: false },
      rituals: defaultRituals(),
      boneCast: { freeCastsRemaining: 1, castsSincePity: 0, lastResult: null },
      lastCampaign: null,
      pendingOffline: null,

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
        set((s) => ({ account: { ...s.account, resonance: Math.max(0, Math.round(n)) } })),

      addResonance: (n) =>
        set((s) => ({ account: { ...s.account, resonance: Math.max(0, s.account.resonance + n) } })),

      spendResonance: (n) => {
        if (get().account.resonance < n) return false;
        set((s) => ({ account: { ...s.account, resonance: s.account.resonance - n } }));
        return true;
      },

      addFeathers: (n) =>
        set((s) => ({ account: { ...s.account, feathers: s.account.feathers + n } })),

      spendFeathers: (n) => {
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

      doBoneCast: (useFeathers) => {
        const s = get();
        if (useFeathers) {
          // handled by caller spending feathers for ×10; here single paid cast is free-first
        } else if (s.boneCast.freeCastsRemaining <= 0) {
          return null;
        }
        const { result } = rollBoneCast(s.boneCast.castsSincePity);
        const nextSincePity = isRunePlus(result.rarity) ? 0 : s.boneCast.castsSincePity + 1;

        // apply reward
        let feathersDelta = 0;
        const runes = [...s.account.runes];
        const skins = [...s.account.cosmetics.skins];
        if (result.rarity === 'feathers') feathersDelta += 25;
        if (result.rarity === 'rune') runes.push(result.label);
        if (result.rarity === 'cosmetic') skins.push(result.label);

        set({
          boneCast: {
            freeCastsRemaining: useFeathers ? s.boneCast.freeCastsRemaining : s.boneCast.freeCastsRemaining - 1,
            castsSincePity: nextSincePity,
            lastResult: result,
          },
          account: {
            ...s.account,
            feathers: s.account.feathers + feathersDelta,
            runes,
            cosmetics: { ...s.account.cosmetics, skins: Array.from(new Set(skins)) },
          },
        });
        return result;
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

      watchAdQuest: () =>
        set((s) => {
          const quests = s.rituals.quests.map((q) => ({ ...q }));
          const q = quests.find((x) => x.id === 'watch_ad');
          if (!q) return {};
          q.progress = Math.min(q.target, q.progress + 1);
          return {
            rituals: { ...s.rituals, quests },
            account: {
              ...s.account,
              adMetrics: { todayWatched: s.account.adMetrics.todayWatched + 1 },
            },
          };
        }),

      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),

      resetAccount: () =>
        set({
          account: defaultAccount(),
          rituals: defaultRituals(),
          boneCast: { freeCastsRemaining: 1, castsSincePity: 0, lastResult: null },
          lastCampaign: null,
          pendingOffline: null,
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
      }),
    },
  ),
);

function bumpQuest(rituals: DailyRituals, id: string, by: number): DailyRituals {
  const quests = rituals.quests.map((q) => ({ ...q }));
  const q = quests.find((x) => x.id === id);
  if (q && !q.claimed) q.progress = Math.min(q.target, q.progress + by);
  return { ...rituals, quests };
}
