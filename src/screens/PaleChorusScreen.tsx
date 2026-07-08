import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Header, Panel } from '@/components/ui';
import { ENEMIES } from '@/game/constants';
import type { EnemyType } from '@/game/types';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaleChorus'>;

const ORDER: EnemyType[] = ['wisp', 'wailer', 'shrieker', 'husk', 'whisper'];

const TAG_COLOR: Record<string, string> = {
  FODDER: colors.textMute,
  DEBUFFER: '#a6c17a',
  SWARM: '#e0a0c3',
  TANK: colors.purpleLight,
  'BOSS · WAVE 15': colors.goldLight,
};

export function PaleChorusScreen({ navigation }: Props) {
  return (
    <Screen bg="top">
      <Header kicker="ENEMY CODEX" title="THE PALE CHORUS" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {ORDER.map((type) => {
          const e = ENEMIES[type];
          const boss = type === 'whisper';
          return (
            <Panel
              key={type}
              border={boss ? 'rgba(255,255,255,.35)' : e.border.replace('0.8)', '0.28)')}
              glowColor={boss ? 'rgba(200,180,230,.4)' : undefined}
              style={styles.card}
            >
              <View
                style={[
                  styles.glyph,
                  {
                    width: e.size + 16,
                    height: e.size + 22,
                    backgroundColor: e.color,
                    borderColor: e.border,
                    shadowColor: boss ? '#c8b4e6' : e.border,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.between}>
                  <T variant="display" size={boss ? 15 : 14}>
                    {e.name}
                  </T>
                  <T variant="mono" size={9} color={TAG_COLOR[e.tag] ?? colors.textMute}>
                    {e.tag}
                  </T>
                </View>
                <T variant="body" size={10} color={boss ? colors.textDim : colors.textMute} style={{ marginTop: 2 }}>
                  {e.lore}
                </T>
                <T variant="mono" size={9} color={colors.textFaint} style={{ marginTop: 4 }}>
                  {e.blurb}
                </T>
              </View>
            </Panel>
          );
        })}
        <T variant="mono" size={9} color={colors.textGhost} center style={{ marginTop: 4 }}>
          Stats are placeholder balance numbers — tune before soft launch.
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 18, gap: 9 },
  card: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  glyph: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
