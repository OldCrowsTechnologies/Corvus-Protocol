import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { T } from './T';

type Kind = 'primary' | 'purple' | 'gold' | 'ghost' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  kind?: Kind;
  sub?: string;
  right?: string;
  disabled?: boolean;
  flex?: number;
  size?: number;
  style?: ViewStyle;
}

const GRADIENTS: Record<'primary' | 'purple' | 'gold', [string, string]> = {
  primary: [colors.tealDeep, colors.teal],
  purple: [colors.purple, '#9678d0'],
  gold: [colors.gold, colors.goldLight],
};

const GLOW: Record<Kind, string> = {
  primary: colors.teal,
  purple: colors.purple,
  gold: colors.gold,
  ghost: 'transparent',
  outline: 'transparent',
};

const LABEL_COLOR: Record<Kind, string> = {
  primary: '#04191c',
  purple: '#ffffff',
  gold: '#241a05',
  ghost: colors.textMute,
  outline: colors.tealSoft,
};

export function GlowButton({
  label,
  onPress,
  kind = 'primary',
  sub,
  right,
  disabled,
  flex,
  size = 18,
  style,
}: Props) {
  const handle = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  const isGradient = kind === 'primary' || kind === 'purple' || kind === 'gold';
  const content = (
    <View style={styles.inner}>
      <View style={styles.row}>
        <T variant="display" size={size} color={LABEL_COLOR[kind]} spacing={size * 0.05}>
          {label}
        </T>
        {right ? (
          <T variant="mono" size={11} color={kind === 'ghost' ? colors.textMute : 'rgba(4,25,28,.8)'}>
            {right}
          </T>
        ) : null}
      </View>
      {sub ? (
        <T variant="mono" size={10} color={kind === 'primary' ? 'rgba(4,25,28,.75)' : colors.textFaint} spacing={1}>
          {sub}
        </T>
      ) : null}
    </View>
  );

  const glowStyle: ViewStyle = GLOW[kind] !== 'transparent'
    ? {
        shadowColor: GLOW[kind],
        shadowOpacity: disabled ? 0 : 0.45,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
        elevation: disabled ? 0 : 10,
      }
    : {};

  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      style={({ pressed }) => [
        { flex, opacity: disabled ? 0.45 : pressed ? 0.9 : 1, borderRadius: radii.lg },
        glowStyle,
        style,
      ]}
    >
      {isGradient ? (
        <LinearGradient colors={GRADIENTS[kind]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.body}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.body,
            kind === 'ghost'
              ? { backgroundColor: 'rgba(255,255,255,.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,.1)' }
              : { backgroundColor: 'rgba(0,194,199,.07)', borderWidth: 1, borderColor: 'rgba(0,194,199,.28)' },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
  },
  inner: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
