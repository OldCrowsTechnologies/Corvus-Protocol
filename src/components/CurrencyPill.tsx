import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/game/formulas';
import { colors, radii } from '@/theme/tokens';
import { FeatherIcon, ResonanceIcon } from './icons';
import { T } from './T';

export function ResonancePill({ amount, rate }: { amount: number; rate?: number }) {
  return (
    <View style={[styles.pill, styles.gold]}>
      <ResonanceIcon size={13} />
      <T variant="monoBold" size={13} color={colors.goldLight}>
        {formatNumber(amount)}
      </T>
      {rate != null ? (
        <T variant="mono" size={10} color="#8a7a3f">
          +{Math.round(rate)}/s
        </T>
      ) : null}
    </View>
  );
}

export function FeatherPill({ amount }: { amount: number }) {
  return (
    <View style={[styles.pill, styles.teal]}>
      <FeatherIcon size={11} />
      <T variant="monoBold" size={12} color={colors.tealSoft}>
        {formatNumber(amount)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  gold: { backgroundColor: 'rgba(184,146,42,.1)', borderColor: 'rgba(184,146,42,.4)' },
  teal: { backgroundColor: 'rgba(0,194,199,.1)', borderColor: 'rgba(0,194,199,.35)' },
});
