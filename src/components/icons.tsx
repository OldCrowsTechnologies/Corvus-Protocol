import React from 'react';
import { Image } from 'react-native';

import { currencyArt } from '@/art';

/** Resonance — soft currency. Bible gold coin (matches the gold Resonance theme). */
export function ResonanceIcon({ size = 14 }: { size?: number }) {
  return <Image source={currencyArt.resonance} style={{ width: size * 1.35, height: size * 1.35, resizeMode: 'contain' }} />;
}

/** Feathers — premium currency. Bible teal Echo-Shards crystal (distinct from the soft coin). */
export function FeatherIcon({ size = 12 }: { size?: number }) {
  return <Image source={currencyArt.feathers} style={{ width: size * 1.5, height: size * 1.5, resizeMode: 'contain' }} />;
}
