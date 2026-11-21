import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { METERING_FULL_SCALE } from '../../../utils/audioLevel';

/** Silence still draws a short bar, so the strip reads as a line, not a gap. */
const MIN_BAR_HEIGHT = 3;

type Props = {
  /** One level per bar, from `addWaveformSample`. */
  samples: readonly number[];
  /**
   * Bars in the strip. While recording this is the whole maximum length, so
   * the strip fills as it goes; bars past `samples` are drawn as still to
   * come. Defaults to `samples.length` (a finished recording).
   */
  slots?: number;
  /** Height of a full-scale bar, in points. @default 56 */
  height?: number;
  /** Colour for recorded bars. */
  color: string;
  /** Colour for bars still to come, or not yet played. @default `OUTLINE_VARIANT` */
  pendingColor?: string;
  /**
   * How much has been played, 0 to 1. Bars after that point take
   * `pendingColor`. Leave unset to draw every recorded bar in `color`.
   */
  progress?: number;
  testID?: string;
};

/**
 * A voice log's waveform: the live strip while recording, and the saved one
 * on each card.
 *
 * Bars are centred on the strip's midline, the way a voice recorder draws
 * them, rather than rising from a baseline like the Decibel Meter's level
 * display.
 *
 * Hidden from assistive tech: it is a picture of the sound. The timer or
 * duration beside it carries the information.
 */
export default function Waveform({
  samples,
  slots = samples.length,
  height = 56,
  color,
  pendingColor,
  progress,
  testID,
}: Props) {
  const COLORS = useTheme();
  const upcoming = pendingColor ?? COLORS.OUTLINE_VARIANT;

  return (
    <View
      style={[styles.strip, { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      // Inside a seek control the strip's own frame is the touch target,
      // so a tap's position is measured across the whole strip, not a bar.
      pointerEvents="none"
    >
      {Array.from({ length: slots }, (_, index) => {
        const sample = samples[index];
        const played =
          progress === undefined || index < Math.round(progress * slots);
        const lit = sample !== undefined && played;
        const fraction =
          sample !== undefined
            ? Math.min(1, Math.max(0, sample / METERING_FULL_SCALE))
            : 0;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(MIN_BAR_HEIGHT, fraction * height),
                backgroundColor: lit ? color : upcoming,
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
