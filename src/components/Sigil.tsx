import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * The Corvus sigil — a violet four-point star-burst inside teal/gold ritual rings.
 * Matches the game-bible logo mark; bridges the tri-color identity (teal · gold · violet).
 */
export function Sigil({ size = 180 }: { size?: number }) {
  const c = size / 2;
  const star = (cx: number, cy: number, r: number, r2: number) =>
    `M${cx} ${cy - r} L${cx + r2} ${cy - r2} L${cx + r} ${cy} L${cx + r2} ${cy + r2} L${cx} ${cy + r} L${cx - r2} ${cy + r2} L${cx - r} ${cy} L${cx - r2} ${cy - r2} Z`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="sigilCore" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor="#efe6ff" stopOpacity={1} />
            <Stop offset="45%" stopColor={colors.purpleLight} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={colors.purple} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* outer teal ring */}
        <Circle cx={c} cy={c} r={size * 0.47} stroke="rgba(0,194,199,0.4)" strokeWidth={1} fill="none" />
        {/* dashed gold ring */}
        <Circle
          cx={c}
          cy={c}
          r={size * 0.36}
          stroke="rgba(184,146,42,0.55)"
          strokeWidth={1}
          strokeDasharray="4 6"
          fill="none"
        />
        {/* inner teal ring */}
        <Circle cx={c} cy={c} r={size * 0.24} stroke="rgba(0,194,199,0.5)" strokeWidth={1} fill="none" />

        {/* burst glow */}
        <Circle cx={c} cy={c} r={size * 0.3} fill="url(#sigilCore)" opacity={0.6} />

        {/* four-point star */}
        <G>
          <Path d={star(c, c, size * 0.3, size * 0.055)} fill={colors.purpleLight} opacity={0.9} />
          <Path d={star(c, c, size * 0.18, size * 0.035)} fill="#f2ecff" />
          {/* diagonal minor rays */}
          <Path
            d={star(c, c, size * 0.16, size * 0.03)}
            fill="rgba(0,194,199,0.7)"
            transform={`rotate(45 ${c} ${c})`}
          />
        </G>
      </Svg>
    </View>
  );
}
