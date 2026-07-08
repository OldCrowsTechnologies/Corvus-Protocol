import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/game/formulas';
import { colors, radii } from '@/theme/tokens';
import { FeatherIcon, ResonanceIcon } from './icons';
import { T } from './T';

/** Resonance — soft currency (purple crystal). */
export function ResonancePill({ amount, rate }: { amount: number; rate?: number }) {
  return (
    <View style={[styles.pill, styles.violet]}>
      <ResonanceIcon size={14} />
      <T variant="monoBold" size={13} color={colors.purpleSoft}>
        {formatNumber(amount)}
      </T>
      {rate != null ? (
        <T variant="mono" size={10} color="#8a7bb5">
          +{Math.round(rate)}/s
        </T>
      ) : null}
    </View>
  );
}

/** Murder Coins — premium currency (gold coin). `FeatherPill` name kept internally. */
export function FeatherPill({ amount }: { amount: number }) {
  return (
    <View style={[styles.pill, styles.gold]}>
      <FeatherIcon size={13} />
      <T variant="monoBold" size={12} color={colors.goldLight}>
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
  violet: { backgroundColor: 'rgba(107,79,160,.12)', borderColor: 'rgba(107,79,160,.42)' },
});
