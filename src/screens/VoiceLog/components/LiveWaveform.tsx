import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { METERING_FULL_SCALE } from '../../../utils/audioLevel';

/** Silence still draws a short bar, so the strip reads as a line, not a gap. */
const MIN_BAR_HEIGHT = 3;

type Props = {
  /** One level per bar, from `addWaveformSample`. Bars past the end are to come. */
  samples: readonly number[];
  /** Bars in the strip: the whole recording's length, so it fills as it goes. */
  slots: number;
  /** Height of a full-scale bar, in points. @default 56 */
  height?: number;
  /** Colour for recorded bars. Bars still to come use `OUTLINE_VARIANT`. */
  color: string;
};

/**
 * The Voice Log recorder's live waveform.
 *
 * One bar per slice of the maximum recording length, so the strip fills from
 * left to right as time runs out and doubles as the progress bar. Bars are
 * centred on the strip's midline, the way a voice recorder draws them, rather
 * than rising from a baseline like the Decibel Meter's level display.
 *
 * Hidden from assistive tech: it is a picture of the sound. The timer beside
 * it carries the information.
 */
export default function LiveWaveform({
  samples,
  slots,
  height = 56,
  color,
}: Props) {
  const COLORS = useTheme();

  return (
    <View
      style={[styles.strip, { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="voice-log-waveform"
    >
      {Array.from({ length: slots }, (_, index) => {
        const sample = samples[index];
        const recorded = sample !== undefined;
        const fraction = recorded
          ? Math.min(1, Math.max(0, sample / METERING_FULL_SCALE))
          : 0;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(MIN_BAR_HEIGHT, fraction * height),
                backgroundColor: recorded ? color : COLORS.OUTLINE_VARIANT,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});
