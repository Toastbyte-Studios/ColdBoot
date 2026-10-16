import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  AIR_ACKNOWLEDGEMENT,
  GROUND_TO_AIR_SIGNALS,
  GroundSignal,
  ICAO_GROUND_SIGNALS,
  OLDER_GROUND_SIGNALS,
} from './data';

const isAndroid = Platform.OS === 'android';

/**
 * GroundToAirSignalsScreen component
 *
 * A fully offline reference to the symbols survivors lay on the ground for
 * search aircraft. The current international code (ICAO Annex 12) comes
 * first; the older emergency code that survival cards still print follows,
 * labelled, because some of its symbols mean something else today. Each entry
 * shows the symbol, its meaning, minimum size and suggested materials, and the
 * screen ends with how a pilot acknowledges a signal.
 *
 * Sources and wording rules are in `./data`.
 *
 * @returns A React element rendering the Ground-to-Air Signals reference screen.
 */
export default function GroundToAirSignalsScreen() {
  const COLORS = useTheme();
  const groundTone = isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND;

  return (
    <StackScreen
      title="Ground-to-Air Signals"
      subtitle={`${GROUND_TO_AIR_SIGNALS.length} symbols`}
      note="Lay these symbols on open ground using rocks, logs, or any high-contrast material. Make each at least 2.5 m (8 ft) long, and bigger if you can. Choose a clearing with maximum sky visibility."
    >
      <SectionEyebrow>International code (ICAO)</SectionEyebrow>
      {ICAO_GROUND_SIGNALS.map((signal) => (
        <SignalCard key={signal.symbol} signal={signal} />
      ))}

      <SectionEyebrow style={styles.eyebrow}>Older code</SectionEyebrow>
      <Text style={[styles.prose, { color: groundTone }]}>
        Still printed on many survival cards, but not part of today's
        international code, so a pilot may not know them. In this older code X
        meant "unable to proceed"; today it means you need medical help.
      </Text>
      {OLDER_GROUND_SIGNALS.map((signal) => (
        <SignalCard key={signal.symbol} signal={signal} />
      ))}

      <SectionEyebrow style={styles.eyebrow}>Reply from the air</SectionEyebrow>
      <Text style={[styles.prose, { color: groundTone }]}>
        {AIR_ACKNOWLEDGEMENT}
      </Text>

      <Text style={[styles.prose, styles.tip, { color: groundTone }]}>
        Tip: pair ground signals with audio signals (whistle, Morse code) and
        movement at regular intervals to increase detectability.
      </Text>
    </StackScreen>
  );
}

/**
 * One symbol. ICAO symbols carry the accent edge; the older code's don't, so
 * the current code reads as the one to reach for.
 */
function SignalCard({ signal }: { signal: GroundSignal }) {
  const COLORS = useTheme();
  const current = signal.code === 'icao';

  return (
    <View
      style={[
        styles.signalCard,
        cardSurface(COLORS, current ? { accent: COLORS.ACCENT } : {}),
      ]}
    >
      <View style={styles.signalHeader}>
        <Text
          style={[
            styles.signalSymbol,
            { color: current ? COLORS.ACCENT : COLORS.BRAND },
          ]}
        >
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
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginTop: SPACING.lg,
  },
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
  prose: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  tip: {
    marginTop: SPACING.sm,
  },
});
