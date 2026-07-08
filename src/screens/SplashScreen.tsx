import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Sigil } from '@/components/Sigil';
import { T } from '@/components/T';
import { colors } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    Animated.timing(progress, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // Navigate on a hard timer, NOT the animation callback — guarantees the splash
    // always advances on-device even if the animation is throttled or interrupted.
    const nav = setTimeout(() => navigation.replace('MainMenu'), 2600);
    return () => clearTimeout(nav);
  }, [navigation, progress, drift]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['4%', '100%'] });

  return (
    <Screen bg="campaign">
      <View style={styles.center}>
        <Animated.View style={[styles.sigil, { transform: [{ translateY }] }]}>
          <Sigil size={186} />
        </Animated.View>

        <T variant="displayHeavy" size={30} center spacing={1.8} glow="rgba(0,194,199,.4)" style={styles.title}>
          CORVUS{'\n'}PROTOCOL
        </T>
        <T variant="displayMed" size={12} color={colors.gold} spacing={6} center>
          THE OMEN WARS
        </T>
      </View>

      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={{ width: barWidth, height: '100%' }}>
            <LinearGradient colors={[colors.tealDeep, colors.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
          </Animated.View>
        </View>
        <T variant="mono" size={10} color={colors.textFaint} spacing={1.4} center style={{ marginTop: 12 }}>
          AWAKENING THE TONAL ENGINE…
        </T>
        <T variant="mono" size={9} color={colors.hairline} spacing={2} center style={{ marginTop: 22 }}>
          OLD CROWS WIRELESS · MAD APPS
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 34 },
  sigil: { width: 186, height: 186, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  ringOuter: { position: 'absolute', inset: 0, borderRadius: 93, borderWidth: 1, borderColor: 'rgba(0,194,199,.35)' },
  ringDashed: { position: 'absolute', inset: 26, borderRadius: 70, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(184,146,42,.5)' },
  core: {
    position: 'absolute',
    inset: 52,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.4)',
    backgroundColor: '#0f1826',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.teal,
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { marginTop: 8, lineHeight: 34 },
  bottom: { paddingHorizontal: 40, paddingBottom: 60 },
  track: { height: 4, borderRadius: 999, backgroundColor: '#111a26', overflow: 'hidden' },
  fill: { flex: 1, borderRadius: 999 },
});
