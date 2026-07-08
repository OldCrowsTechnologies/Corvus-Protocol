import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { T } from './T';

export type CoachAnchor = 'top' | 'board' | 'palette' | 'center';

export interface CoachStep {
  title: string;
  body: string;
  anchor: CoachAnchor;
  /** true = wait for the player to perform the action (no button); false = show a NEXT/BEGIN button. */
  awaitAction?: boolean;
}

interface Props {
  step: CoachStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

/**
 * First-run coaching. A single card anchored near the region it references, with a
 * pulsing pointer. Action steps auto-advance from the parent; info steps show a button.
 */
export function TutorialOverlay({ step, index, total, onNext, onSkip }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const last = index === total - 1;

  const pos =
    step.anchor === 'top'
      ? styles.atTop
      : step.anchor === 'palette'
        ? styles.atPalette
        : step.anchor === 'board'
          ? styles.atBoard
          : styles.atCenter;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* dim scrim that still lets board taps through on action steps */}
      <View style={styles.scrim} pointerEvents="none" />

      <Animated.View style={[styles.pointer, pos, { transform: [{ scale }], opacity }]} pointerEvents="none">
        <T variant="body" size={22} color={colors.teal}>
          {step.anchor === 'top' ? '▲' : step.anchor === 'palette' ? '▼' : '◈'}
        </T>
      </Animated.View>

      <View style={[styles.cardWrap, pos]} pointerEvents="box-none">
        <LinearGradient
          colors={['#12233a', '#0a1420']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHead}>
            <T variant="mono" size={9} color={colors.tealSoft} spacing={1.4}>
              RITE OF PASSAGE · {index + 1}/{total}
            </T>
            <Pressable onPress={onSkip} hitSlop={8}>
              <T variant="mono" size={9} color={colors.textFaint}>
                SKIP
              </T>
            </Pressable>
          </View>
          <T variant="display" size={16} style={{ marginTop: 6 }}>
            {step.title}
          </T>
          <T variant="body" size={12} color={colors.textDim} style={{ marginTop: 6 }}>
            {step.body}
          </T>
          {step.awaitAction ? (
            <T variant="mono" size={10} color={colors.teal} style={{ marginTop: 10 }}>
              ↳ try it now…
            </T>
          ) : (
            <Pressable onPress={onNext} style={styles.nextBtn}>
              <T variant="display" size={13} color="#04191c" spacing={0.6}>
                {last ? 'BEGIN THE DEFENSE' : 'NEXT'}
              </T>
            </Pressable>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,7,11,0.45)' },
  cardWrap: { position: 'absolute', left: 20, right: 20 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,0.5)',
    padding: 16,
    shadowColor: colors.teal,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.teal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  pointer: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  atTop: { top: 96 },
  atBoard: { top: '42%' },
  atPalette: { bottom: 120 },
  atCenter: { top: '38%' },
});
