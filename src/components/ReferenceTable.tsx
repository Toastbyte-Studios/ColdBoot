import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../theme';
import { cardSurface } from '../theme/cardSurface';
import { Text } from './ScaledText';

const isAndroid = Platform.OS === 'android';

export type ReferenceTableRow = {
  /** The thing being looked up — a letter, a character. */
  key: string;
  /** What it maps to. Rendered in order, each in its own column. */
  values: string[];
};

type Props = {
  rows: ReferenceTableRow[];
  /**
   * Index of the value column to set in a monospaced face — a Morse pattern,
   * where the dots and dashes have to line up down the column.
   */
  monospaceColumn?: number;
};

/**
 * A lookup table: a key and what it maps to, one row each, on one card.
 *
 * The Morse cheat sheet and the NATO alphabet each drew every row as its own
 * bordered box — 26 and 36 stacked outlines — which is the "developer art"
 * read the redesign is removing. One card with hairline-separated rows is the
 * same information at a fraction of the visual weight, and it matches the
 * grouped lists everywhere else.
 *
 * It is not a `GroupContainer` of `ModuleRow`s: nothing here is tappable, and
 * a `ModuleRow` announces itself as a button.
 */
export default function ReferenceTable({ rows, monospaceColumn }: Props) {
  const COLORS = useTheme();

  return (
    <View style={[styles.card, cardSurface(COLORS)]}>
      {rows.map((row, index) => (
        <View
          key={row.key}
          style={[
            styles.row,
            index < rows.length - 1 && [
              styles.divided,
              {
                borderBottomColor: isAndroid
                  ? COLORS.OUTLINE_VARIANT
                  : COLORS.SEPARATOR,
              },
            ],
          ]}
          accessible
          accessibilityLabel={`${row.key}. ${row.values.join('. ')}`}
        >
          <Text style={[styles.key, { color: COLORS.BRAND }]}>{row.key}</Text>
          {row.values.map((value, column) => (
            <Text
              key={column}
              style={[
                styles.value,
                column === monospaceColumn && styles.monospace,
              ]}
            >
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // StackScreen's Android content is full-bleed; the card carries the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  divided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  key: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
  },
  value: {
    fontSize: 16,
    flexShrink: 1,
  },
  monospace: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 18,
    letterSpacing: 1,
    minWidth: 78,
  },
});
