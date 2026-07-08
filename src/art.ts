/**
 * Central art map for everything sliced from the game bible (docs/design/GAME_BIBLE.png):
 * enemy sprites, currency crystals, tower icons, cosmetics, the consumable, UI/buff icon sets,
 * and the logo lockup. Character portraits live in cast.ts.
 */
import type { ImageSourcePropType } from 'react-native';

import type { EnemyType, TowerType } from '@/game/types';

/** Engine enemy type → bible sprite. (pale_stalker/revenant_knight/soul_harvester are spares.) */
export const enemyArt: Record<EnemyType, ImageSourcePropType> = {
  wisp: require('../assets/enemies/whisperling.png'),
  wailer: require('../assets/enemies/echo_wraith.png'),
  shrieker: require('../assets/enemies/void_shrieker.png'),
  husk: require('../assets/enemies/mourning_titan.png'),
  whisper: require('../assets/enemies/whisper_boss.png'),
};

export const whisperBossFramed = require('../assets/enemies/whisper_boss_framed.png');

export const towerArt: Record<TowerType, ImageSourcePropType> = {
  corvus: require('../assets/towers/corvus.png'),
  sage: require('../assets/towers/sage.png'),
  pip: require('../assets/towers/pip.png'),
  mira: require('../assets/towers/mira.png'),
};

export const currencyArt = {
  // Two-currency economy. Resonance (soft) = the purple Resonance crystal;
  // Murder Coins (premium, `feathers` field internally) = the gold coin.
  resonance: require('../assets/currency/resonance_crystal.png'),
  feathers: require('../assets/currency/murder_coins.png'),
  echoShards: require('../assets/currency/echo_shards.png'),
  essence: require('../assets/currency/essence.png'),
} as const;

export const cosmeticArt = {
  krragh: require('../assets/cosmetics/krragh.png'),
  corvus_plague: require('../assets/cosmetics/corvus_plague_skin.png'),
  threshold_realm: require('../assets/cosmetics/threshold_realm.png'),
  trickster_mantle: require('../assets/cosmetics/trickster_mantle.png'),
  battlepass_corvus: require('../assets/cosmetics/battlepass_corvus.png'),
} as const;

export const itemArt = {
  ritual: require('../assets/items/basic_ritual.png'),
} as const;

export const brandLogo = require('../assets/brand/logo.png');

export type UiIconName =
  | 'home' | 'tower' | 'cart' | 'bag' | 'crown'
  | 'gear' | 'mail' | 'chart' | 'group' | 'help' | 'close';

export const uiIcon: Record<UiIconName, ImageSourcePropType> = {
  home: require('../assets/ui/icons/home.png'),
  tower: require('../assets/ui/icons/tower.png'),
  cart: require('../assets/ui/icons/cart.png'),
  bag: require('../assets/ui/icons/bag.png'),
  crown: require('../assets/ui/icons/crown.png'),
  gear: require('../assets/ui/icons/gear.png'),
  mail: require('../assets/ui/icons/mail.png'),
  chart: require('../assets/ui/icons/chart.png'),
  group: require('../assets/ui/icons/group.png'),
  help: require('../assets/ui/icons/help.png'),
  close: require('../assets/ui/icons/close.png'),
};

export type BuffIconName = 'up' | 'down' | 'skull' | 'burst' | 'clover' | 'boot' | 'clock' | 'shield';

export const buffIcon: Record<BuffIconName, ImageSourcePropType> = {
  up: require('../assets/ui/buffs/up.png'),
  down: require('../assets/ui/buffs/down.png'),
  skull: require('../assets/ui/buffs/skull.png'),
  burst: require('../assets/ui/buffs/burst.png'),
  clover: require('../assets/ui/buffs/clover.png'),
  boot: require('../assets/ui/buffs/boot.png'),
  clock: require('../assets/ui/buffs/clock.png'),
  shield: require('../assets/ui/buffs/shield.png'),
};
