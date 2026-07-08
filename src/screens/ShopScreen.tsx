import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FeatherPill, ResonancePill } from '@/components/CurrencyPill';
import { FeatherIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Header, Panel } from '@/components/ui';
import { formatNumber } from '@/game/formulas';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;
type Tab = 'cosmetics' | 'consumables' | 'pass' | 'feathers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cosmetics', label: 'COSMETICS' },
  { id: 'consumables', label: 'CONSUMABLES' },
  { id: 'pass', label: 'PASS' },
  { id: 'feathers', label: 'FEATHERS' },
];

export function ShopScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'consumables');
  const account = useStore((s) => s.account);
  const buyRitual = useStore((s) => s.buyRitual);
  const purchasePass = useStore((s) => s.purchasePass);
  const cancelPass = useStore((s) => s.cancelPass);
  const addFeathers = useStore((s) => s.addFeathers);
  const claimAdReward = useStore((s) => s.claimAdReward);

  return (
    <Screen bg="top">
      <Header
        title="SHOP"
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <ResonancePill amount={account.resonance} />
            <FeatherPill amount={account.feathers} />
          </View>
        }
      />

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, active ? styles.tabActive : styles.tabIdle]}
            >
              <T variant="mono" size={9} color={active ? '#04191c' : colors.textMute} spacing={0.5}>
                {t.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'consumables' && (
          <>
            <Panel border="rgba(0,194,199,.22)" style={styles.rowCard}>
              <View style={styles.ritualIcon}>
                <T variant="mono" size={7} color={colors.textGhost} center>
                  RITUAL{'\n'}ICON
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.between}>
                  <T variant="display" size={15}>
                    Basic Ritual
                  </T>
                  <T variant="mono" size={9} color={colors.textFaint}>
                    OWNED · {account.consumables.ritual}
                  </T>
                </View>
                <T variant="body" size={11} color={colors.textMute} style={{ marginVertical: 4 }}>
                  +50% Resonance this run · 1-use
                </T>
                <Pressable
                  onPress={() => {
                    if (!buyRitual()) Alert.alert('Not enough Resonance', 'Basic Ritual costs 500 Resonance (max 10 held).');
                  }}
                  style={styles.buyBtn}
                >
                  <T variant="monoBold" size={11} color={colors.tealSoft}>
                    BUY · 500 <T variant="monoBold" size={11} color={colors.goldLight}>RP</T>
                  </T>
                </Pressable>
              </View>
            </Panel>

            <ScrollAdRow
              onWatch={() =>
                claimAdReward(500)
                  ? Alert.alert('Reward', '+500 Resonance · quest progress logged.')
                  : Alert.alert('Ad limit reached', 'You have claimed all 3 rewarded ads for today.')
              }
              today={account.adMetrics.todayWatched}
            />
          </>
        )}

        {tab === 'pass' && (
          <LinearGradient
            colors={['rgba(184,146,42,.18)', 'rgba(13,110,122,.14)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.passCard}
          >
            <View style={styles.between}>
              <View>
                <T variant="mono" size={9} color={colors.goldLight} spacing={1.6}>
                  SUBSCRIPTION
                </T>
                <T variant="display" size={18}>
                  Convenience Pass
                </T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T variant="monoBold" size={18} color={colors.goldLight}>
                  $9.99
                </T>
                <T variant="mono" size={9} color="#8a7a3f">
                  / MONTH
                </T>
              </View>
            </View>
            <View style={{ marginVertical: 12, gap: 6 }}>
              {['Remove all rewarded ads', '+50% offline Resonance', '1 free retry per campaign'].map((f) => (
                <T key={f} variant="body" size={12} color="#d9e0e8">
                  ✦ {f}
                </T>
              ))}
            </View>
            <Pressable
              onPress={() =>
                account.subscription.conveniencePassActive
                  ? Alert.alert('Convenience Pass', 'Cancel your subscription?', [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Cancel Pass', style: 'destructive', onPress: cancelPass },
                    ])
                  : (purchasePass(), Alert.alert('Subscribed', 'Convenience Pass active. Ads removed, offline +50%.'))
              }
            >
              <LinearGradient colors={[colors.gold, colors.goldLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subBtn}>
                <T variant="display" size={15} color="#241a05" spacing={0.8}>
                  {account.subscription.conveniencePassActive ? 'ACTIVE ✓' : 'SUBSCRIBE'}
                </T>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        )}

        {tab === 'feathers' && (
          <>
            <T variant="body" italic size={10} color={colors.textMute} center style={{ marginBottom: 6 }}>
              Feathers: earned via Daily Rituals, or bought here.
            </T>
            <View style={styles.packGrid}>
              <FeatherPack tier="HANDFUL" amount={100} bonus={null} price="$1.99" onBuy={() => grant(addFeathers, 100)} />
              <FeatherPack tier="POUCH" amount={550} bonus="+10%" price="$9.99" tag="POPULAR" tagColor={colors.teal} onBuy={() => grant(addFeathers, 550)} />
              <FeatherPack tier="HOARD" amount={1200} bonus="+20%" price="$19.99" onBuy={() => grant(addFeathers, 1200)} />
              <FeatherPack tier="MURDER'S RANSOM" amount={3000} bonus="+35%" price="$49.99" tag="BEST VALUE" tagColor={colors.goldLight} onBuy={() => grant(addFeathers, 3000)} />
            </View>
            <View style={styles.disclosure}>
              <T variant="mono" size={9} color={colors.textFaint} center>
                Feathers never expire. No pay-to-win — cosmetics, Bone-Cast rolls & convenience only.
              </T>
            </View>
          </>
        )}

        {tab === 'cosmetics' && (
          <View style={{ gap: 10 }}>
            {account.cosmetics.skins.map((skin) => (
              <Panel key={skin} style={styles.rowCard}>
                <View style={[styles.ritualIcon, { borderStyle: 'solid', borderColor: 'rgba(184,146,42,.4)' }]}>
                  <T variant="mono" size={7} color="#8a7a3f" center>
                    SKIN
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="display" size={14}>
                    {skin.replace(/_/g, ' ').toUpperCase()}
                  </T>
                  <T variant="mono" size={9} color={account.cosmetics.equippedSkin === skin ? colors.teal : colors.textFaint}>
                    {account.cosmetics.equippedSkin === skin ? 'EQUIPPED' : 'OWNED'}
                  </T>
                </View>
              </Panel>
            ))}
            <T variant="body" italic size={11} color={colors.textMute} center style={{ marginTop: 8 }}>
              More skins unlock through prestige epochs & Bone-Cast.
            </T>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function grant(addFeathers: (n: number) => void, n: number) {
  addFeathers(n);
  Alert.alert('Purchase complete', `+${n} Feathers added. (Sandbox — no real charge.)`);
}

function ScrollAdRow({ onWatch, today }: { onWatch: () => void; today: number }) {
  return (
    <View style={styles.adRow}>
      <View>
        <T variant="bodySemi" size={12}>
          Watch ad → 3× offline
        </T>
        <T variant="mono" size={9} color={colors.textFaint}>
          {today} / 3 today
        </T>
      </View>
      <Pressable onPress={onWatch} style={styles.watchBtn}>
        <T variant="mono" size={11} color={colors.tealSoft}>
          ▶ WATCH
        </T>
      </Pressable>
    </View>
  );
}

function FeatherPack({
  tier,
  amount,
  bonus,
  price,
  tag,
  tagColor,
  onBuy,
}: {
  tier: string;
  amount: number;
  bonus: string | null;
  price: string;
  tag?: string;
  tagColor?: string;
  onBuy: () => void;
}) {
  const featured = !!tag;
  return (
    <Pressable onPress={onBuy} style={{ width: '48%' }}>
      <LinearGradient
        colors={featured ? ['#1c2a2c', '#0f1c1d'] : ['#141d2b', '#0c131d']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.pack,
          featured
            ? { borderColor: tagColor, borderWidth: 2, shadowColor: tagColor, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } }
            : { borderColor: 'rgba(184,146,42,.3)', borderWidth: 1 },
        ]}
      >
        {tag ? (
          <View style={[styles.packTag, { backgroundColor: tagColor }]}>
            <T variant="mono" size={7} color="#04191c" spacing={0.6}>
              {tag}
            </T>
          </View>
        ) : null}
        <View style={{ marginVertical: 10, alignItems: 'center' }}>
          <FeatherIcon size={26} />
        </View>
        <T variant="monoBold" size={16} center>
          {formatNumber(amount)}
          {bonus ? <T variant="mono" size={9} color={colors.goldLight}>{'  '}{bonus}</T> : null}
        </T>
        <T variant="mono" size={8} color={colors.textFaint} center style={{ marginBottom: 8 }}>
          {tier}
        </T>
        <T variant="bodySemi" size={12} color={featured ? colors.tealSoft : colors.goldLight} center>
          {price}
        </T>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.sm, borderWidth: 1 },
  tabActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabIdle: { backgroundColor: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)' },
  body: { padding: 22, gap: 16 },
  rowCard: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  ritualIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,194,199,.4)',
    backgroundColor: '#0f1826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,194,199,.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.5)',
  },
  adRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
  },
  watchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: 'rgba(0,194,199,.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,.4)',
  },
  passCard: { padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(184,146,42,.5)' },
  subBtn: { paddingVertical: 13, borderRadius: radii.md, alignItems: 'center' },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  pack: { padding: 13, borderRadius: radii.md, alignItems: 'center' },
  packTag: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  disclosure: {
    marginTop: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
  },
});
