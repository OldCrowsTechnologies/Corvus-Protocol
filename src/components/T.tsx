import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts, fs } from '@/theme/tokens';

type Variant =
  | 'display'
  | 'displayHeavy'
  | 'displayMed'
  | 'body'
  | 'bodyMed'
  | 'bodySemi'
  | 'bodyBold'
  | 'mono'
  | 'monoBold';

const familyFor: Record<Variant, string> = {
  display: fonts.display,
  displayHeavy: fonts.displayHeavy,
  displayMed: fonts.displayMed,
  body: fonts.body,
  bodyMed: fonts.bodyMed,
  bodySemi: fonts.bodySemi,
  bodyBold: fonts.bodyBold,
  mono: fonts.mono,
  monoBold: fonts.monoBold,
};

interface Props extends TextProps {
  variant?: Variant;
  size?: number;
  color?: string;
  spacing?: number; // letterSpacing
  center?: boolean;
  italic?: boolean;
  glow?: string; // shadow color for text glow
  style?: TextStyle | TextStyle[];
}

/** App text primitive. `variant` picks the font family; the rest are quick style props. */
export function T({
  variant = 'body',
  size = 14,
  color = colors.paper,
  spacing,
  center,
  italic,
  glow,
  style,
  children,
  ...rest
}: Props) {
  const composed: TextStyle = {
    fontFamily: familyFor[variant],
    fontSize: fs(size),
    color,
    letterSpacing: spacing,
    textAlign: center ? 'center' : undefined,
    fontStyle: italic ? 'italic' : undefined,
  };
  if (glow) {
    composed.textShadowColor = glow;
    composed.textShadowRadius = 18;
    composed.textShadowOffset = { width: 0, height: 0 };
  }
  return (
    <Text style={[styles.base, composed, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
