import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';

import { brandLogo, uiIcon, type UiIconName } from '@/art';
import { GlowButton } from '@/components/GlowButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { FeatherPill, ResonancePill } from '@/components/CurrencyPill';
import { nextPrestigeMultiplier } from '@/game/formulas';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

export function MainMenuScreen({ navigation }: Props) {
  const account = useStore((s) => s.account);
  const last = useStore((s) => s.lastCampaign);
  const pendingOffline = useStore((s) => s.pendingOffline);
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    ).start();
  }, [glow]);

  // If an offline reward is pending, offer the idle screen first.
  useEffect(() => {
    if (pendingOffline && pendingOffline.earned > 0) {
      const t = setTimeout(() => navigation.navigate('Idle'), 250);
      return () => clearTimeout(t);
    }
  }, [pendingOffline, navigation]);

  const resume = last?.active;

  return (
    <Screen bg="menu">
      {/* radial ring flourishes */}
      <View pointerEvents="none" style={styles.ringBig} />
      <View pointerEvents="none" style={styles.ringSmall} />

      <View style={styles.top}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ResonancePill amount={account.resonance} />
          <FeatherPill amount={account.feathers} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T variant="mono" size={10} color={colors.textFaint} spacing={1.4}>
            EPOCH {account.epoch}
          </T>
          <T variant="monoBold" size={15} color={colors.teal}>
            {account.prestigeMultiplier.toFixed(account.prestigeMultiplier >= 100 ? 0 : 3)}×
          </T>
        </View>
      </View>

      <View style={styles.hero}>
        <Image source={brandLogo} style={styles.logo} />
      </View>

      <View style={styles.menu}>
        <GlowButton
          label="PLAY"
          right={resume ? 'RESUME ▸' : 'NEW ▸'}
          sub={resume ? `WAVE ${last?.wave}/15 · ${last?.difficulty?.toUpperCase()}` : 'BEGIN A NEW CAMPAIGN'}
          size={20}
          onPress={() =>
            resume && last
              ? navigation.navigate('Campaign', { difficulty: last.difficulty, resume: true })
              : navigation.navigate('Difficulty')
          }
        />

        <Pressable onPress={() => navigation.navigate('Prestige')} style={[styles.secondary, styles.prestige]}>
          <T variant="displayMed" size={17} color={colors.purpleSoft} spacing={1.3}>
            PRESTIGE
          </T>
          <T variant="mono" size={11} color="#8a7bb5">
            → EPOCH {account.epoch + 1} · {nextPrestigeMultiplier(account.epoch).toFixed(2)}×
          </T>
        </Pressable>

        <View style={styles.grid2}>
          <MenuTile label="ROOKERY" icon="crown" color={colors.gold} onPress={() => navigation.navigate('Rookery')} />
          <MenuTile label="RITUALS" icon="home" color={colors.teal} onPress={() => navigation.navigate('DailyRituals')} />
        </View>
        <View style={styles.grid2}>
          <MenuTile label="BONE-CAST" icon="tower" color={colors.purpleSoft} onPress={() => navigation.navigate('BoneCast')} />
          <MenuTile label="CODEX" icon="chart" color={colors.textMute} onPress={() => navigation.navigate('PaleChorus')} />
        </View>
        <View style={styles.grid2}>
          <MenuTile label="SHOP" icon="cart" color={colors.tealSoft} onPress={() => navigation.navigate('Shop')} />
          <MenuTile label="SETTINGS" icon="gear" color={colors.textMute} onPress={() => navigation.navigate('Settings')} />
        </View>
      </View>
    </Screen>
  );
}

function MenuTile({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: UiIconName;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}>
      <Image source={uiIcon[icon]} style={styles.tileIcon} />
      <T variant="displayMed" size={14} color={color} spacing={1.1}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ringBig: {
    position: 'absolute',
    bottom: -60,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.1)',
  },
  ringSmall: {
    position: 'absolute',
    bottom: -20,
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(184,146,42,.14)',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  hero: { marginTop: 30, alignItems: 'center' },
  logo: { width: 280, height: 158, resizeMode: 'contain' },
  menu: { marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  secondary: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  prestige: { backgroundColor: 'rgba(107,79,160,.14)', borderColor: 'rgba(107,79,160,.5)' },
  grid2: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
  },
  tileIcon: { width: 18, height: 18, resizeMode: 'contain', opacity: 0.9 },
});
