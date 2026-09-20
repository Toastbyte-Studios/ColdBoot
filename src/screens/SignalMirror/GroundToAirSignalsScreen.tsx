import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { GROUND_TO_AIR_SIGNALS } from './data';

const isAndroid = Platform.OS === 'android';

/**
 * GroundToAirSignalsScreen component
 *
 * Displays a fully offline reference guide to internationally recognised
 * ground-to-air distress symbols. Each entry shows the symbol, its meaning,
 * recommended minimum construction size, and suggested materials.
 *
 * Based on ICAO Annex 12 and standard Search & Rescue conventions.
 *
 * @returns A React element rendering the Ground-to-Air Signals reference screen.
 */
export default function GroundToAirSignalsScreen() {
  const COLORS = useTheme();

  return (
    <StackScreen
      title="Ground-to-Air Signals"
      subtitle={`${GROUND_TO_AIR_SIGNALS.length} symbols`}
      note="Lay these symbols on open ground using rocks, logs, or any high-contrast material. Minimum 3 m per character. Best viewed from aircraft at altitude — choose a clearing with maximum sky visibility."
    >
      {GROUND_TO_AIR_SIGNALS.map((signal) => (
        <View
          key={signal.symbol}
          style={[
            styles.signalCard,
            cardSurface(COLORS, { accent: COLORS.ACCENT }),
          ]}
        >
          <View style={styles.signalHeader}>
            <Text style={[styles.signalSymbol, { color: COLORS.ACCENT }]}>
              {signal.symbol}
            </Text>
            <Text style={styles.signalMeaning}>{signal.meaning}</Text>
          </View>
          <View style={styles.sizeRow}>
            <Icon name="resize-outline" size={14} color={COLORS.MUTED} />
            <Text style={[styles.signalDetail, { color: COLORS.MUTED }]}>
              <Text style={styles.signalDetailLabel}>Min size: </Text>
              {signal.minSize}
            </Text>
          </View>
          <Text style={[styles.signalDetail, { color: COLORS.MUTED }]}>
            <Text style={styles.signalDetailLabel}>Materials: </Text>
            {signal.materials}
          </Text>
        </View>
      ))}

      <Text
        style={[
          styles.tip,
          { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
        ]}
      >
        Tip: pair ground signals with audio signals (whistle, Morse code) and
        movement at regular intervals to increase detectability.
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  signalCard: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  signalSymbol: {
    fontSize: 40,
    fontWeight: '900',
    minWidth: 56,
    textAlign: 'center',
  },
  signalMeaning: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  signalDetail: {
    fontSize: 13,
    marginTop: SPACING.xs,
    lineHeight: 18,
    flexShrink: 1,
  },
  signalDetailLabel: {
    fontWeight: '700',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs + 2,
  },
  tip: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACING.sm,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
