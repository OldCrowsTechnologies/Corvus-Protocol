/**
 * Character art — painterly plague-doctor crows sliced from the game bible
 * (docs/design/GAME_BIBLE.png). Each character has a head-centered `portrait`
 * (for circular avatars / chips) and a `full` full-body plate (hero displays).
 * Rosa isn't in the bible's core four yet, so she falls back to her Meshy render.
 */
import type { ImageSourcePropType } from 'react-native';

export type CharId = 'corvus' | 'sage' | 'pip' | 'mira' | 'rosa';
export type CastKind = 'portrait' | 'full';

type CastMap = Record<CharId, Record<CastKind, ImageSourcePropType>>;

export const cast: CastMap = {
  corvus: {
    portrait: require('../assets/cast/corvus_portrait.png'),
    full: require('../assets/cast/corvus_full.png'),
  },
  sage: {
    portrait: require('../assets/cast/sage_portrait.png'),
    full: require('../assets/cast/sage_full.png'),
  },
  pip: {
    portrait: require('../assets/cast/pip_portrait.png'),
    full: require('../assets/cast/pip_full.png'),
  },
  mira: {
    portrait: require('../assets/cast/mira_portrait.png'),
    full: require('../assets/cast/mira_full.png'),
  },
  rosa: {
    portrait: require('../assets/cast/rosa_front.png'),
    full: require('../assets/cast/rosa_threeq_l.png'),
  },
};

export function castArt(id: CharId, kind: CastKind = 'portrait'): ImageSourcePropType {
  return cast[id][kind];
}
