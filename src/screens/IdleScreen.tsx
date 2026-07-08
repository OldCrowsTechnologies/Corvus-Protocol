import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';

import { castArt } from '@/cast';
import { GlowButton } from '@/components/GlowButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { ProgressBar } from '@/components/ui';
import { formatNumber } from '@/game/formulas';
import { OFFLINE_CAP_HOURS } from '@/game/constants';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Idle'>;

export function IdleScreen({ navigation }: Props) {
  const pending = useStore((s) => s.pendingOffline);
  const claimOffline = useStore((s) => s.claimOffline);
  const last = useStore((s) => s.lastCampaign);
  const claimAdReward = useStore((s) => s.claimAdReward);
  const pass = useStore((s) => s.account.subscription.conveniencePassActive);
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [drift]);

  const earned = pending?.earned ?? 0;
  const hours = pending?.hours ?? 0;
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const claimAndResume = () => {
    claimOffline();
    if (last?.active) navigation.replace('Campaign', { difficulty: last.difficulty, resume: true });
    else navigation.replace('MainMenu');
  };

  return (
    <Screen bg="campaign">
      <T variant="displayMed" size={11} color={colors.gold} spacing={4} center style={{ marginTop: 16 }}>
        THE PALE CHORUS WAITS
      </T>

      <Animated.View style={[styles.portrait, { transform: [{ translateY }] }]}>
        <Image source={castArt('corvus', 'portrait')} style={styles.portraitImg} />
      </Animated.View>
      <T variant="body" italic size={12} color={colors.textDim} center style={{ marginTop: 14, paddingHorizontal: 30 }}>
        “The Pale Chorus always waits.”
      </T>

      <LinearGradient
        colors={['rgba(184,146,42,.16)', 'rgba(13,110,122,.1)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.earnCard}
      >
        <T variant="mono" size={10} color="#8a7a3f" spacing={1.6} center>
          OFFLINE RESONANCE EARNED
        </T>
        <T variant="monoBold" size={38} color={colors.goldLight} center glow="rgba(184,146,42,.5)" style={{ marginVertical: 4 }}>
          {formatNumber(earned)}
        </T>
        <T variant="body" size={11} color={colors.textMute} center>
          The Tonal Engine has been working…{pass ? ' (Pass +50%)' : ''}
        </T>
        <View style={{ marginTop: 12 }}>
          <ProgressBar pct={Math.min(1, hours / OFFLINE_CAP_HOURS)} colors={[colors.gold, colors.goldLight]} />
        </View>
        <View style={styles.capRow}>
          <T variant="mono" size={9} color={colors.textFaint}>
            {hours.toFixed(1)}h / {OFFLINE_CAP_HOURS}h cap
          </T>
          <T variant="mono" size={9} color={colors.textFaint}>
            {last ? `LAST: WAVE ${last.wave}/15` : 'NO RUN YET'}
          </T>
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <GlowButton label="CLAIM & RESUME" flex={1.5} size={15} onPress={claimAndResume} />
        <GlowButton label="PRESTIGE" kind="purple" flex={1} size={14} onPress={() => navigation.navigate('Prestige')} />
      </View>

      <View style={styles.upsell}>
        <Pressable
          onPress={() => { claimAdReward(earned); claimOffline(); navigation.replace('MainMenu'); }}
          style={[styles.upsellBtn, { backgroundColor: 'rgba(0,194,199,.08)', borderColor: 'rgba(0,194,199,.3)' }]}
        >
          <T variant="mono" size={10} color={colors.tealSoft}>
            ▶ AD → 2× REWARD
          </T>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Shop', { tab: 'pass' })}
          style={[styles.upsellBtn, { backgroundColor: 'rgba(184,146,42,.1)', borderColor: 'rgba(184,146,42,.35)' }]}
        >
          <T variant="mono" size={10} color={colors.goldLight}>
            PASS · $9.99/mo
          </T>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  portrait: {
    marginTop: 20,
    alignSelf: 'center',
    width: 150,
    height: 150,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.5)',
    backgroundColor: '#0c1420',
    shadowColor: colors.teal,
    shadowOpacity: 0.4,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  portraitImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  earnCard: {
    marginHorizontal: 24,
    marginTop: 20,
    padding: 18,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(184,146,42,.42)',
  },
  capRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 'auto' },
  upsell: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  upsellBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radii.md, borderWidth: 1 },
});
