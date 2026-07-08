import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

type Bg = 'menu' | 'campaign' | 'prestige' | 'reveal' | 'flat' | 'top';

/** Radial-ish background variants approximated with a LinearGradient (RN has no radial). */
const BACKGROUNDS: Record<Bg, [string, string, string]> = {
  menu: ['#243a55', '#152234', '#0c1520'],
  campaign: ['#26374f', '#16233a', '#0c1420'],
  prestige: ['#2c2350', '#1a1430', '#0e0c1a'],
  reveal: ['#3a2a54', '#241a38', '#120c1c'],
  flat: ['#1a2636', '#111c2a', '#0a1018'],
  top: ['#243a55', '#152234', '#0c1520'],
};

interface Props {
  bg?: Bg;
  edges?: Edge[];
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Screen({ bg = 'menu', edges = ['top', 'bottom'], children, style }: Props) {
  const g = BACKGROUNDS[bg];
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={g}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.voidBlack },
  safe: { flex: 1 },
});
