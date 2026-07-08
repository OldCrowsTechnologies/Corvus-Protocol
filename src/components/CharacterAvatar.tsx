import React from 'react';
import { Image, View, type ImageStyle } from 'react-native';

import { castArt, type CharId } from '@/cast';
import { charColors } from '@/theme/tokens';

interface Props {
  id: CharId;
  size?: number;
  square?: boolean;
  radius?: number;
  borderWidth?: number;
  dim?: boolean;
}

/** Circular (or rounded-square) character portrait with the character's accent border + glow. */
export function CharacterAvatar({ id, size = 44, square, radius, borderWidth = 2, dim }: Props) {
  const c = charColors[id];
  const br = radius ?? (square ? size * 0.28 : size / 2);
  const imgStyle: ImageStyle = { width: '100%', height: '100%', resizeMode: 'cover' };
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: br,
        overflow: 'hidden',
        borderWidth,
        borderColor: c.main,
        backgroundColor: '#0c1420',
        shadowColor: c.main,
        shadowOpacity: dim ? 0.15 : 0.5,
        shadowRadius: size * 0.35,
        shadowOffset: { width: 0, height: 0 },
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Image source={castArt(id, 'portrait')} style={imgStyle} />
    </View>
  );
}
