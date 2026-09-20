import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

type Props = {
  /** Current level, 0-100. See `normalizeMeteringLevel`. */
  level: number;
  /** Bars drawn. @default 16 */
  barCount?: number;
  /** Height of the tallest bar, in points. @default 36 */
  height?: number;
  /** Announced to assistive tech; the bars themselves carry no text. */
  accessibilityLabel?: string;
};

/**
 * A compact microphone level meter.
 *
 * The Decibel Meter screen's 20-bar, 120pt display in miniature: same rising
 * profile and the same green/amber/red thresholds, small enough to sit under
 * a recording timer as a "we can hear you" cue rather than as a reading.
 *
 * Inactive bars stay visible at low opacity so the meter keeps its shape in
 * silence instead of collapsing to nothing.
 */
export default function LevelMeter({
  level,
  barCount = 16,
  height = 36,
  accessibilityLabel,
}: Props) {
  const COLORS = useTheme();

  const colorFor = (barLevel: number): string => {
    if (barLevel < 40) return COLORS.SUCCESS;
    if (barLevel < 70) return COLORS.ACCENT;
    return COLORS.ERROR;
  };

  return (
    <View
      style={[styles.container, { height }]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(level) }}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        const barLevel = ((index + 1) / barCount) * 100;
        const isActive = level >= barLevel;
        // Shortest bar is a third of the tallest, so the row reads as a ramp.
        const barHeight = (0.33 + (index / (barCount - 1)) * 0.67) * height;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              isActive ? styles.barActive : styles.barInactive,
              {
                height: barHeight,
                backgroundColor: isActive
                  ? colorFor(barLevel)
                  : COLORS.OUTLINE_VARIANT,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
  },
  barActive: {
    opacity: 1,
  },
  barInactive: {
    // Kept visible so the meter holds its shape in silence.
    opacity: 0.4,
  },
});
