import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

/** Resonance — soft currency. Gold radial-ish dot. */
export function ResonanceIcon({ size = 14 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.goldLight, colors.gold]}
      start={{ x: 0.35, y: 0.3 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: colors.gold,
        shadowOpacity: 0.7,
        shadowRadius: size * 0.7,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

/** Feathers — premium currency. Teal→gold rotated diamond (distinct from both soft currencies). */
export function FeatherIcon({ size = 12 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={[colors.teal, colors.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: 2,
          transform: [{ rotate: '45deg' }],
          shadowColor: colors.teal,
          shadowOpacity: 0.6,
          shadowRadius: size * 0.6,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
}
