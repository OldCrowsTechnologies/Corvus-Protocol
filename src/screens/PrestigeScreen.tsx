import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';

import { cosmeticArt } from '@/art';
import { GlowButton } from '@/components/GlowButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { formatNumber, nextPrestigeMultiplier } from '@/game/formulas';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Prestige'>;

const COSMETIC_NAMES: Record<string, string> = {
  corvus_plague: 'Corvus · Plague-Bearer',
  sage_oracle: 'Sage · Oracle Veil',
  pip_gilded: 'Pip · Gilded Thief',
  mira_eclipse: 'Mira · Eclipse Crown',
  altar_violet: 'Altar · Violet Vigil',
};

export function PrestigeScreen({ navigation }: Props) {
  const account = useStore((s) => s.account);
  const chars = account.characters;
  const doPrestige = useStore((s) => s.doPrestige);
  const [busy, setBusy] = useState(false);

  const newEpoch = account.epoch + 1;
  const newMult = nextPrestigeMultiplier(account.epoch);
  const cosmeticKey = ['corvus_plague', 'sage_oracle', 'pip_gilded', 'mira_eclipse', 'altar_violet'][(newEpoch - 1) % 5];

  const confirm = () => {
    setBusy(true);
    const res = doPrestige();
    Alert.alert(
      `Ascended to Epoch ${res.newEpoch}`,
      `“Eternal recurrence. I love it.” — Corvus\n\nMultiplier now ${res.newMultiplier.toFixed(2)}×.`,
      [{ text: 'Continue', onPress: () => navigation.navigate('MainMenu') }],
    );
  };

  return (
    <Screen bg="prestige">
      <View pointerEvents="none" style={styles.aura} />

      <View style={styles.head}>
        <T variant="mono" size={10} color="#8a7bb5" spacing={3.2} center>
          ETERNAL RECURRENCE
        </T>
        <T variant="displayHeavy" size={26} center spacing={1} glow="rgba(107,79,160,.5)" style={{ marginTop: 8, lineHeight: 30 }}>
          ASCEND TO{'\n'}EPOCH {newEpoch}
        </T>
      </View>

      <View style={styles.multRow}>
        <View style={{ alignItems: 'center' }}>
          <T variant="mono" size={9} color={colors.textFaint} spacing={1.4}>
            CURRENT
          </T>
          <T variant="monoBold" size={26} color={colors.textMute}>
            {account.prestigeMultiplier.toFixed(2)}×
          </T>
        </View>
        <T variant="body" size={22} color={colors.purple}>
          →
        </T>
        <View style={{ alignItems: 'center' }}>
          <T variant="mono" size={9} color={colors.goldLight} spacing={1.4}>
            NEW
          </T>
          <T variant="monoBold" size={34} color={colors.goldLight} glow="rgba(184,146,42,.6)">
            {newMult.toFixed(2)}×
          </T>
        </View>
      </View>

      <View style={styles.resetCard}>
        <T variant="mono" size={10} color={colors.purpleLight} spacing={1.6} style={{ marginBottom: 9 }}>
          THE PATTERN RESETS
        </T>
        <ResetRow left={`Resonance ${formatNumber(account.resonance)}`} />
        <ResetRow left={`Corvus L${chars.corvus.level} · Sage L${chars.sage.level}`} />
        <ResetRow left={`Pip L${chars.pip.level} · Mira L${chars.mira.level}`} />
      </View>

      <LinearGradient
        colors={['rgba(184,146,42,.16)', 'rgba(107,79,160,.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.unlock}
      >
        <View style={styles.unlockIcon}>
          <Image source={cosmeticArt.corvus_plague} style={styles.unlockImg} />
        </View>
        <View>
          <T variant="mono" size={9} color="#8a7a3f" spacing={1.4}>
            EPOCH REWARD
          </T>
          <T variant="display" size={15} color={colors.goldLight}>
            {COSMETIC_NAMES[cosmeticKey]}
          </T>
        </View>
      </LinearGradient>

      <T variant="body" italic size={11} color="#8a7bb5" center style={styles.quote}>
        “Eternal recurrence. I love it.” — Corvus
      </T>

      <View style={styles.footer}>
        <GlowButton label="CANCEL" kind="ghost" flex={1} size={15} onPress={() => navigation.goBack()} />
        <GlowButton label="CONFIRM ASCENT" kind="purple" flex={1.4} size={15} disabled={busy} onPress={confirm} />
      </View>
    </Screen>
  );
}

function ResetRow({ left }: { left: string }) {
  return (
    <View style={styles.resetRow}>
      <T variant="body" size={12} color={colors.textDim}>
        {left}
      </T>
      <T variant="body" size={12} color={colors.textMute}>
        → 0
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(107,79,160,.16)',
  },
  head: { paddingHorizontal: 24, paddingTop: 20 },
  multRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  resetCard: {
    marginHorizontal: 24,
    marginTop: 22,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(107,79,160,.1)',
    borderWidth: 1,
    borderColor: 'rgba(107,79,160,.35)',
  },
  resetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  unlock: {
    marginHorizontal: 24,
    marginTop: 14,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(184,146,42,.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(184,146,42,.5)',
    backgroundColor: '#1c150c',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unlockImg: { width: 48, height: 48, resizeMode: 'cover' },
  quote: { marginTop: 'auto', paddingHorizontal: 24 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
});
