import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FeatherPill } from '@/components/CurrencyPill';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Header, Panel, ProgressBar } from '@/components/ui';
import type { DailyQuest } from '@/game/types';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyRituals'>;

export function DailyRitualsScreen({ navigation }: Props) {
  const rituals = useStore((s) => s.rituals);
  const feathers = useStore((s) => s.account.feathers);
  const claimQuest = useStore((s) => s.claimQuest);
  const claimWeekly = useStore((s) => s.claimWeekly);
  const claimAdReward = useStore((s) => s.claimAdReward);

  return (
    <Screen bg="top">
      <Header title="DAILY RITUALS" onBack={() => navigation.goBack()} right={<FeatherPill amount={feathers} />} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* login streak */}
        <Panel>
          <T variant="mono" size={9} color={colors.textFaint} spacing={1.4} style={{ marginBottom: 9 }}>
            7-DAY VIGIL · DAY {rituals.streakDay}
          </T>
          <View style={styles.streakRow}>
            {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
              const done = day < rituals.streakDay;
              const today = day === rituals.streakDay;
              const isSeven = day === 7;
              return (
                <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={[
                      styles.streakCell,
                      done && { backgroundColor: colors.teal },
                      today && { backgroundColor: 'rgba(0,194,199,.18)', borderWidth: 1, borderColor: colors.teal },
                      !done && !today && (isSeven
                        ? { backgroundColor: 'rgba(184,146,42,.16)', borderWidth: 1, borderColor: 'rgba(184,146,42,.6)' }
                        : { backgroundColor: 'rgba(255,255,255,.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', borderStyle: 'dashed' }),
                    ]}
                  >
                    {done ? (
                      <T variant="mono" size={11} color="#04191c">
                        ✓
                      </T>
                    ) : null}
                  </View>
                  <T variant="mono" size={7} color={isSeven ? colors.goldLight : colors.textFaint} style={{ marginTop: 3 }}>
                    {isSeven ? '7★' : day}
                  </T>
                </View>
              );
            })}
          </View>
        </Panel>

        {/* daily quests */}
        <T variant="mono" size={10} color={colors.textFaint} spacing={2}>
          TODAY
        </T>
        <View style={{ gap: 8 }}>
          {rituals.quests.map((q) => (
            <QuestRow
              key={q.id}
              quest={q}
              onClaim={() => claimQuest(q.id)}
              onWatch={() => {
                if (!claimAdReward(500)) Alert.alert('Ad limit reached', 'You have claimed all 3 rewarded ads for today.');
              }}
            />
          ))}
        </View>

        {/* weekly */}
        <LinearGradient
          colors={['rgba(184,146,42,.16)', 'rgba(107,79,160,.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekly}
        >
          <View style={styles.between}>
            <T variant="mono" size={9} color={colors.goldLight} spacing={1.4}>
              WEEKLY RITE
            </T>
            <T variant="mono" size={9} color={colors.textMute}>
              {rituals.weekly.progress} / {rituals.weekly.target}
            </T>
          </View>
          <T variant="bodySemi" size={13} style={{ marginTop: 3 }}>
            {rituals.weekly.label}
          </T>
          <View style={{ marginTop: 8 }}>
            <ProgressBar pct={rituals.weekly.progress / rituals.weekly.target} colors={[colors.gold, colors.goldLight]} />
          </View>
          <View style={[styles.between, { marginTop: 6 }]}>
            <T variant="mono" size={9} color={colors.goldLight}>
              Reward: {rituals.weekly.reward} Murder Coins + cosmetic border
            </T>
            {rituals.weekly.progress >= rituals.weekly.target && !rituals.weekly.claimed ? (
              <Pressable onPress={() => { claimWeekly(); Alert.alert('Claimed', `+${rituals.weekly.reward} Murder Coins`); }} style={styles.claimBtn}>
                <T variant="mono" size={10} color="#241a05">
                  CLAIM
                </T>
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>
      </ScrollView>
    </Screen>
  );
}

function QuestRow({ quest, onClaim, onWatch }: { quest: DailyQuest; onClaim: () => void; onWatch: () => void }) {
  const complete = quest.progress >= quest.target;
  const rewardLabel = `+${quest.reward} MURDER COINS${quest.bonusResonance ? ` · +${quest.bonusResonance} RP` : ''}`;
  return (
    <Panel border={complete && !quest.claimed ? 'rgba(0,194,199,.35)' : 'rgba(255,255,255,.08)'} style={styles.questRow}>
      <View style={{ flex: 1 }}>
        <T variant="bodySemi" size={12}>
          {quest.label}
        </T>
        <T variant="mono" size={9} color={quest.claimed ? colors.teal : complete ? colors.teal : colors.textMute}>
          {quest.claimed ? `CLAIMED · ${rewardLabel}` : complete ? `DONE · ${rewardLabel}` : `${quest.progress} / ${quest.target} · ${rewardLabel}`}
        </T>
      </View>
      {quest.claimed ? (
        <T variant="mono" size={11} color={colors.textFaint}>
          ✓
        </T>
      ) : complete ? (
        <Pressable onPress={onClaim} style={styles.claimBtnTeal}>
          <T variant="monoBold" size={10} color="#04191c">
            CLAIM
          </T>
        </Pressable>
      ) : quest.isAd ? (
        <Pressable onPress={onWatch} style={styles.watchBtn}>
          <T variant="mono" size={10} color={colors.tealSoft}>
            ▶ WATCH
          </T>
        </Pressable>
      ) : (
        <View style={{ width: 44 }}>
          <ProgressBar pct={quest.progress / quest.target} color={colors.textFaint} track="#1a212b" height={5} />
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14 },
  streakRow: { flexDirection: 'row', gap: 5 },
  streakCell: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekly: { padding: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(184,146,42,.4)' },
  claimBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.goldLight },
  claimBtnTeal: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.teal },
  watchBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(0,194,199,.1)', borderWidth: 1, borderColor: 'rgba(0,194,199,.35)' },
});
