import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Header, Panel, Toggle } from '@/components/ui';
import { setMusicEnabled } from '@/audio/sounds';
import { useStore } from '@/state/store';
import { colors, radii } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const account = useStore((s) => s.account);
  const resetAccount = useStore((s) => s.resetAccount);

  const confirmReset = () =>
    Alert.alert('Reset account', 'This wipes all progress, epochs, and Murder Coins. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetAccount();
          navigation.navigate('MainMenu');
        },
      },
    ]);

  return (
    <Screen bg="top">
      <Header title="SETTINGS" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section label="AUDIO">
          <ToggleRow label="Music" value={settings.music} onToggle={() => { const next = !settings.music; setSetting('music', next); setMusicEnabled(next); }} last={false} />
          <ToggleRow label="Sound effects" value={settings.sfx} onToggle={() => setSetting('sfx', !settings.sfx)} last={false} />
          <ToggleRow label="Voice lines" value={settings.voice} onToggle={() => setSetting('voice', !settings.voice)} last />
        </Section>

        <Section label="DISPLAY">
          <View style={[styles.settingRow, styles.rowBorder]}>
            <T variant="body" size={13}>
              Graphics
            </T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['low', 'high'] as const).map((g) => {
                const active = settings.graphics === g;
                return (
                  <Pressable key={g} onPress={() => setSetting('graphics', g)} style={[styles.seg, active ? styles.segOn : styles.segOff]}>
                    <T variant="mono" size={10} color={active ? '#04191c' : colors.textMute}>
                      {g.toUpperCase()}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ToggleRow label="Debug metrics" value={settings.debugMetrics} onToggle={() => setSetting('debugMetrics', !settings.debugMetrics)} last />
        </Section>

        <Section label="ACCOUNT">
          <View style={styles.settingRow}>
            <View>
              <T variant="body" size={13}>
                Epoch {account.epoch} · {account.prestigeMultiplier.toFixed(2)}×
              </T>
              <T variant="mono" size={9} color={colors.textFaint}>
                Signed in · guest
              </T>
            </View>
            <Pressable onPress={() => Alert.alert('Sign in', 'Account sync arrives with the backend (Firebase Auth).')} style={styles.signIn}>
              <T variant="mono" size={11} color={colors.tealSoft}>
                SIGN IN
              </T>
            </Pressable>
          </View>
        </Section>

        <Pressable onPress={confirmReset} style={styles.resetBtn}>
          <T variant="mono" size={12} color={colors.danger} spacing={0.8}>
            RESET ACCOUNT
          </T>
        </Pressable>

        <T variant="mono" size={9} color={colors.hairline} spacing={1.6} center style={{ marginTop: 16 }}>
          CORVUS PROTOCOL · v0.1.0 MVP
        </T>
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <T variant="mono" size={10} color={colors.textFaint} spacing={2} style={{ marginBottom: 10 }}>
        {label}
      </T>
      <Panel style={{ padding: 0, overflow: 'hidden' }}>{children}</Panel>
    </View>
  );
}

function ToggleRow({ label, value, onToggle, last }: { label: string; value: boolean; onToggle: () => void; last: boolean }) {
  return (
    <View style={[styles.settingRow, !last && styles.rowBorder]}>
      <T variant="body" size={13}>
        {label}
      </T>
      <Toggle value={value} onToggle={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 18 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.05)' },
  seg: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radii.sm },
  segOn: { backgroundColor: colors.teal },
  segOff: { backgroundColor: 'rgba(255,255,255,.04)' },
  signIn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(0,194,199,.35)' },
  resetBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
});
