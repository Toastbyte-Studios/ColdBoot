import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, TEXT_GUTTER } from '../../../theme';
import { StatusTone } from '../deviceStatusFormatters';

const isAndroid = Platform.OS === 'android';

type ColorScheme = ReturnType<typeof useTheme>;

/** The colour a status dot takes for each tone. */
export function toneColor(tone: StatusTone, COLORS: ColorScheme): string {
  switch (tone) {
    case 'good':
      return COLORS.SUCCESS;
    case 'fair':
      // Amber is the app's one signal colour: "check this", short of an error.
      return COLORS.ACCENT;
    case 'poor':
      return COLORS.ERROR;
    default:
      return COLORS.MUTED;
  }
}

type StatusRowProps = {
  label: string;
  value: string;
  /** A second, quieter line under the value: a unit, a time, a hint. */
  detail?: string;
  /** Shows a dot beside the label; omit for plain readouts. */
  tone?: StatusTone;
  /** Spoken in place of the value when it reads badly aloud (a glyph, MGRS). */
  accessibilityValue?: string;
  isLast?: boolean;
};

/**
 * One label/value readout inside a `GroupContainer`, in the shape of Sun
 * Times' event rows. Not tappable, so it is a plain `View` rather than a
 * `ModuleRow`, which would announce itself as a button.
 */
export default function StatusRow({
  label,
  value,
  detail,
  tone,
  accessibilityValue,
  isLast = false,
}: StatusRowProps) {
  const COLORS = useTheme();

  return (
    <View>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${label}. ${accessibilityValue ?? value}${
          detail ? `. ${detail}` : ''
        }`}
      >
        {tone ? (
          <View
            style={[styles.dot, { backgroundColor: toneColor(tone, COLORS) }]}
          />
        ) : null}
        <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
          {label}
        </Text>
        <View style={styles.valueColumn}>
          <Text style={[styles.value, { color: COLORS.PRIMARY_DARK }]}>
            {value}
          </Text>
          {detail ? (
            <Text style={[styles.detail, { color: COLORS.MUTED }]}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      {!isLast && (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: isAndroid
                ? COLORS.OUTLINE_VARIANT
                : COLORS.SEPARATOR,
            },
          ]}
        />
      )}
    </View>
  );
}

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isAndroid ? SPACING.lg : 11,
    minHeight: 48,
    paddingVertical: isAndroid ? 13 : SPACING.md,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : SPACING.lg,
  },
  dot: {
    width: isAndroid ? 10 : 8,
    height: isAndroid ? 10 : 8,
    borderRadius: isAndroid ? 5 : 4,
  },
  label: {
    flex: 1,
    fontSize: isAndroid ? 16 : 15.5,
    fontWeight: isAndroid ? '400' : '500',
  },
  valueColumn: {
    alignItems: 'flex-end',
    flexShrink: 1,
    maxWidth: '62%',
  },
  value: {
    fontSize: isAndroid ? 16 : 15.5,
    fontWeight: isAndroid ? '500' : '600',
    textAlign: 'right',
  },
  detail: {
    fontSize: 12.5,
    marginTop: 2,
    textAlign: 'right',
  },
  separator: {
    height: isAndroid ? 1 : hairline,
    marginLeft: isAndroid ? TEXT_GUTTER : SPACING.lg,
  },
});
