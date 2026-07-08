import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { T } from './T';

/** Card panel with the signature dark diagonal gradient + subtle accent border. */
export function Panel({
  children,
  style,
  border = 'rgba(255,255,255,.07)',
  glowColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  border?: string;
  glowColor?: string;
}) {
  return (
    <LinearGradient
      colors={[colors.panelHi, colors.panel]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[
        styles.panel,
        { borderColor: border },
        glowColor
          ? { shadowColor: glowColor, shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } }
          : null,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

export function ProgressBar({
  pct,
  color = colors.teal,
  track = '#1a212b',
  height = 5,
  colors: gradientColors,
}: {
  pct: number; // 0..1
  color?: string;
  track?: string;
  height?: number;
  colors?: [string, string];
}) {
  const w = `${Math.max(0, Math.min(1, pct)) * 100}%` as const;
  return (
    <View style={{ height, borderRadius: radii.pill, backgroundColor: track, overflow: 'hidden' }}>
      {gradientColors ? (
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: w, borderRadius: radii.pill }} />
      ) : (
        <View style={{ height: '100%', width: w, backgroundColor: color, borderRadius: radii.pill }} />
      )}
    </View>
  );
}

/** Screen header with an optional back chevron. */
export function Header({
  title,
  kicker,
  onBack,
  right,
}: {
  title: string;
  kicker?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back} hitSlop={10}>
          <T variant="body" size={20} color={colors.textMute}>
            ‹
          </T>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {kicker ? (
          <T variant="mono" size={10} color={colors.textFaint} spacing={2.4}>
            {kicker}
          </T>
        ) : null}
        <T variant="display" size={22} spacing={0.8}>
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}

export function Chip({
  label,
  color = colors.tealSoft,
  bg = 'rgba(0,194,199,.1)',
  border = 'rgba(0,194,199,.4)',
}: {
  label: string;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <T variant="mono" size={9} color={color} spacing={1.4}>
        {label}
      </T>
    </View>
  );
}

/** Simple on/off toggle matching the settings mockup. */
export function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  toggle: { width: 40, height: 23, borderRadius: radii.pill, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.tealDeep },
  toggleOff: { backgroundColor: 'rgba(255,255,255,.1)' },
  knob: { width: 19, height: 19, borderRadius: 10, position: 'absolute' },
  knobOn: { right: 2, backgroundColor: colors.teal },
  knobOff: { left: 2, backgroundColor: colors.textFaint },
});
