import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { castArt, type CharId } from '@/cast';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { GlowButton } from '@/components/GlowButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Chip, ProgressBar } from '@/components/ui';
import { CHAR_META, TOWERS } from '@/game/constants';
import { useStore } from '@/state/store';
import { CHAR_ORDER } from '@/game/types';
import { charColors, colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Rookery'>;

export function RookeryScreen({ navigation }: Props) {
  const characters = useStore((s) => s.account.characters);
  const rosaUnlocked = useStore((s) => s.account.rosaUnlocked);
  const [sel, setSel] = useState<CharId>('corvus');

  const isTower = (id: CharId): id is 'corvus' | 'sage' | 'pip' | 'mira' => id !== 'rosa';
  const meta = CHAR_META[sel];
  const c = charColors[sel];
  const tower = isTower(sel) ? TOWERS[sel] : null;
  const prog = isTower(sel) ? characters[sel] : null;
  const level = prog?.level ?? 0;

  return (
    <Screen bg="campaign">
      <View style={styles.head}>
        <T variant="mono" size={10} color={colors.textFaint} spacing={3} center>
          CORVUS PROTOCOL
        </T>
        <T variant="displayHeavy" size={26} center spacing={1.4} glow="rgba(184,146,42,.3)" style={{ marginTop: 4 }}>
          THE ROOKERY
        </T>
        <T variant="body" italic size={11} color={colors.textMute} center>
          Your Murder awaits the next rite.
        </T>
      </View>

      {/* Perch row */}
      <View style={styles.perch}>
        <View style={styles.perchBar} />
        <View style={styles.perchRow}>
          {CHAR_ORDER.map((id) => {
            const locked = id === 'rosa' && !rosaUnlocked;
            const active = sel === id;
            return (
              <Pressable key={id} onPress={() => setSel(id)} style={{ alignItems: 'center' }}>
                {id === 'rosa' ? <Chip label="NEW" color="#04191c" bg={colors.goldLight} border={colors.goldLight} /> : null}
                <View style={{ transform: [{ scale: active ? 1.12 : 1 }], marginTop: id === 'rosa' ? 2 : 12 }}>
                  <CharacterAvatar id={id} size={id === 'corvus' ? 52 : 44} dim={locked} />
                </View>
                <T variant="mono" size={8} color={c && active ? charColors[id].soft : colors.textMute} spacing={0.4} style={{ marginTop: 6 }}>
                  {CHAR_META[id].name}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Detail card */}
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.detail, { borderColor: c.main + '59', shadowColor: c.main }]}>
          <View style={styles.detailHead}>
            <View style={[styles.detailImg, { borderColor: c.main + '80', shadowColor: c.main }]}>
              <Image source={castArt(sel, 'portrait')} style={styles.detailImgInner} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="display" size={19}>
                {meta.name}
              </T>
              <T variant="mono" size={10} color={c.main} spacing={0.6}>
                {meta.role}
              </T>
              <View style={styles.levelRow}>
                <T variant="mono" size={10} color={colors.textMute}>
                  {isTower(sel) ? `L${level}` : 'LOCKED'}
                </T>
                <View style={{ flex: 1 }}>
                  <ProgressBar pct={prog ? prog.xp / prog.xpMax : 0} color={c.main} track={c.main + '22'} height={4} />
                </View>
              </View>
            </View>
          </View>

          <T variant="body" size={12} color={colors.textDim} style={{ marginTop: 12 }}>
            {tower ? tower.special : 'A pursuit specialist that marks prey for the flock. Unlocks post-launch — reference render only.'}
          </T>

          {tower ? (
            <View style={styles.statGrid}>
              <Stat label="DPS" value={String(tower.dps)} />
              <Stat label="RANGE" value={String(tower.range)} />
              <Stat label="CRIT" value={`${Math.round(tower.critChance * 100)}%`} />
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <GlowButton
            label={isTower(sel) ? `EQUIP ${meta.name}` : 'ROSA — COMING SOON'}
            disabled={!isTower(sel)}
            size={16}
            onPress={() => navigation.navigate('Difficulty')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <T variant="mono" size={8} color={colors.textFaint}>
        {label}
      </T>
      <T variant="monoBold" size={14}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: 14, paddingHorizontal: 24 },
  perch: { marginHorizontal: 18, marginTop: 18, paddingTop: 8, paddingBottom: 20 },
  perchBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 12,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#241a12',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  perchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 6 },
  detail: {
    marginHorizontal: 18,
    marginTop: 6,
    padding: 16,
    borderRadius: radii.xxl,
    backgroundColor: '#0d1620',
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  detailHead: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  detailImg: {
    width: 82,
    height: 118,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  detailImgInner: { width: '100%', height: '100%', resizeMode: 'cover' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,.03)' },
});
