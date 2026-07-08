import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlowButton } from '@/components/GlowButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Chip, Header } from '@/components/ui';
import { DIFFICULTIES, type DifficultyDef } from '@/game/constants';
import type { Difficulty } from '@/game/types';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Difficulty'>;

const CARD_STYLE: Record<Difficulty, { grad: [string, string]; border: string; glow?: string; accent: string }> = {
  easy: { grad: ['#141d2b', '#0c131d'], border: 'rgba(255,255,255,.08)', accent: colors.textFaint },
  normal: { grad: ['#0f2a2c', '#0b1d22'], border: 'rgba(0,194,199,.6)', glow: colors.teal, accent: colors.teal },
  hard: { grad: ['#241826', '#160f1d'], border: 'rgba(107,79,160,.4)', accent: colors.purpleLight },
};

export function DifficultyScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Difficulty>('normal');

  return (
    <Screen bg="top">
      <Header kicker="CAMPAIGN I" title="CHOOSE YOUR TRIAL" onBack={() => navigation.goBack()} />

      <View style={styles.list}>
        {DIFFICULTIES.map((d) => (
          <DifficultyCard key={d.id} def={d} selected={selected === d.id} onPress={() => setSelected(d.id)} />
        ))}
      </View>

      <View style={styles.footer}>
        <GlowButton
          label="BEGIN CAMPAIGN"
          size={18}
          onPress={() => navigation.replace('Campaign', { difficulty: selected })}
        />
      </View>
    </Screen>
  );
}

function DifficultyCard({ def, selected, onPress }: { def: DifficultyDef; selected: boolean; onPress: () => void }) {
  const s = CARD_STYLE[def.id];
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={s.grad}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.card,
          { borderColor: s.border },
          selected && s.glow ? { shadowColor: s.glow, shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } } : null,
        ]}
      >
        <View style={styles.cardHead}>
          <T variant="display" size={19}>
            {def.name}
          </T>
          {selected ? (
            <Chip label="SELECTED" color="#04191c" bg={colors.teal} border={colors.teal} />
          ) : (
            <T variant="mono" size={12} color={s.accent}>
              {def.rewardMult.toFixed(1)}× reward
            </T>
          )}
        </View>
        {selected ? (
          <T variant="mono" size={12} color={colors.teal} style={{ marginTop: 2 }}>
            {def.rewardMult.toFixed(1)}× reward
          </T>
        ) : null}
        <T variant="body" size={12} color={selected ? colors.textDim : colors.textMute} style={{ marginTop: 6 }}>
          {def.blurb}
        </T>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingTop: 20, gap: 14 },
  card: { padding: 16, borderRadius: radii.xl, borderWidth: 1 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { marginTop: 'auto', paddingHorizontal: 24, paddingBottom: 28 },
});
