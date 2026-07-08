import type { Difficulty } from '@/game/types';

export type RootStackParamList = {
  Splash: undefined;
  MainMenu: undefined;
  Difficulty: undefined;
  Campaign: { difficulty: Difficulty; resume?: boolean } | undefined;
  Prestige: undefined;
  Shop: { tab?: 'cosmetics' | 'consumables' | 'pass' | 'feathers' } | undefined;
  Idle: undefined;
  Settings: undefined;
  Rookery: undefined;
  PaleChorus: undefined;
  BoneCast: undefined;
  DailyRituals: undefined;
};
