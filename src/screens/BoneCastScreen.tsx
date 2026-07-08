import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { FeatherIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Header } from '@/components/ui';
import { CAST_X10_COST, ODDS, PITY_INTERVAL } from '@/game/boneCast';
import type { BoneCastResult } from '@/game/types';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BoneCast'>;
type Phase = 'idle' | 'rolling' | 'reveal';

const TIER_COLOR: Record<BoneCastResult['tier'], string> = {
  common: colors.textMute,
  uncommon: colors.tealSoft,
  rare: colors.purpleSoft,
  legendary: colors.goldLight,
};

export function BoneCastScreen({ navigation }: Props) {
  const boneCast = useStore((s) => s.boneCast);
  const feathers = useStore((s) => s.account.feathers);
  const storeCastFree = useStore((s) => s.castFree);
  const storeCastTen = useStore((s) => s.castTen);

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<BoneCastResult | null>(null);
  const burst = useRef(new Animated.Value(0)).current;

  const revealResult = (r: BoneCastResult | null) => {
    if (!r) return;
    setResult(r);
    setPhase('rolling');
    // suspense beat — bones settle before the card resolves (~750ms)
    burst.setValue(0);
    setTimeout(() => {
      setPhase('reveal');
      Animated.timing(burst, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    }, 750);
  };

  const castFree = () => {
    if (boneCast.freeCastsRemaining <= 0) {
      Alert.alert('No free casts', 'Your free cast returns tomorrow — or cast ×10 with Murder Coins.');
      return;
    }
    revealResult(storeCastFree());
  };

  const castTen = () => {
    if (feathers < CAST_X10_COST) {
      Alert.alert('Not enough Murder Coins', `Cast ×10 costs ${CAST_X10_COST} Murder Coins. Earn more in Daily Rituals.`);
      return;
    }
    // Spend + 10 rolls happen atomically in the store; returns the best result to reveal.
    revealResult(storeCastTen());
  };

  const scale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  if (phase !== 'idle' && result) {
    return (
      <Screen bg="reveal">
        <View pointerEvents="none" style={styles.burstHalo} />
        <T variant="mono" size={10} color={colors.purpleSoft} spacing={3} center style={{ marginTop: 70 }}>
          {phase === 'rolling' ? 'THE BONES TUMBLE…' : 'THE PATTERN RESOLVES'}
        </T>

        {phase === 'reveal' ? (
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <T variant="mono" size={10} color={TIER_COLOR[result.tier]} spacing={1.6}>
              {result.tier.toUpperCase()}
            </T>
            <View style={styles.cardIcon}>
              <T variant="mono" size={8} color={colors.purpleLight} center>
                {result.rarity === 'rune' ? 'RUNE' : result.rarity === 'cosmetic' ? 'SKIN' : result.rarity === 'feathers' ? '✦' : 'RP'}
              </T>
            </View>
            <T variant="display" size={16} center>
              {result.label}
            </T>
            <T variant="body" size={11} color={colors.textDim} center style={{ marginTop: 6 }}>
              {result.detail}
            </T>
          </Animated.View>
        ) : (
          <View style={styles.bones}>
            {[0, 1, 2, 3, 4].map((i) => (
              <RollingBone key={i} index={i} />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Pressable onPress={() => { setPhase('idle'); setResult(null); }} disabled={phase === 'rolling'}>
            <LinearGradient colors={[colors.purple, '#9678d0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.claim, phase === 'rolling' && { opacity: 0.5 }]}>
              <T variant="display" size={16} color="#fff" spacing={0.8}>
                CLAIM
              </T>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => { setPhase('idle'); setResult(null); }} disabled={phase === 'rolling'}>
            <T variant="mono" size={11} color={colors.textMute} center style={{ paddingVertical: 12 }}>
              Cast again →
            </T>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="prestige">
      <Header title="CAST THE BONES" kicker="THE CHORUS ANSWERS IN PATTERNS" onBack={() => navigation.goBack()} />

      <View style={styles.bonesIdle}>
        {[-14, 9, -3, 18, -20].map((rot, i) => (
          <View key={i} style={[styles.bone, { transform: [{ rotate: `${rot}deg` }, { translateY: i % 2 ? 6 : 0 }] }]} />
        ))}
      </View>

      <View style={styles.ledger}>
        <T variant="mono" size={9} color={colors.textFaint} spacing={1.4} style={{ marginBottom: 8 }}>
          ODDS · DISCLOSED
        </T>
        {ODDS.map((row) => (
          <View key={row.rarity} style={styles.ledgerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.swatch, { backgroundColor: row.color }]} />
              <T variant="body" size={11} color={colors.textDim}>
                {row.label}
              </T>
            </View>
            <T variant="mono" size={11} color={row.color}>
              {row.pct}%
            </T>
          </View>
        ))}
        <T variant="mono" size={8} color={colors.textGhost} style={{ marginTop: 8 }}>
          Pity: guaranteed Rune+ every {PITY_INTERVAL} casts. ({boneCast.castsSincePity}/{PITY_INTERVAL})
        </T>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={castFree}>
          <LinearGradient colors={[colors.purple, '#9678d0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.claim}>
            <T variant="display" size={16} color="#fff" spacing={0.6}>
              CAST · FREE ({boneCast.freeCastsRemaining} LEFT TODAY)
            </T>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={castTen} style={styles.castTen}>
          <T variant="displayMed" size={13} color={colors.goldLight}>
            CAST ×10{'   '}
          </T>
          <FeatherIcon size={10} />
          <T variant="displayMed" size={13} color={colors.goldLight}>
            {'  '}{CAST_X10_COST} · you hold {feathers}
          </T>
        </Pressable>
      </View>
    </Screen>
  );
}

function RollingBone({ index }: { index: number }) {
  const flip = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(flip, { toValue: 1, duration: 500, delay: index * 150, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [flip, index]);
  const rotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.bone, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  bonesIdle: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: 26 },
  bones: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 40 },
  bone: {
    width: 36,
    height: 50,
    borderRadius: radii.sm,
    backgroundColor: '#221a30',
    borderWidth: 1,
    borderColor: 'rgba(200,180,230,.4)',
  },
  ledger: {
    marginHorizontal: 22,
    marginTop: 26,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
  },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  footer: { marginTop: 'auto', paddingHorizontal: 22, paddingBottom: 28, gap: 10 },
  claim: { paddingVertical: 15, borderRadius: radii.lg, alignItems: 'center', shadowColor: colors.purple, shadowOpacity: 0.5, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
  castTen: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(184,146,42,.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,146,42,.4)',
  },
  burstHalo: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(200,180,230,.12)',
  },
  card: {
    marginTop: 30,
    alignSelf: 'center',
    width: 220,
    padding: 24,
    borderRadius: radii.xxl,
    backgroundColor: 'rgba(20,14,30,.6)',
    borderWidth: 1,
    borderColor: 'rgba(200,180,230,.5)',
    alignItems: 'center',
    shadowColor: '#966ee0',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  cardIcon: {
    width: 64,
    height: 64,
    marginVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(200,180,230,.6)',
    backgroundColor: '#1a1328',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
