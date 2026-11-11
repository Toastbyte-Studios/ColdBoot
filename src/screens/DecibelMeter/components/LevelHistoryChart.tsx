import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { ColorScheme } from '../../../theme/colors';
import {
  HISTORY_BUCKET_MS,
  HISTORY_WINDOW_MS,
  HistoryPoint,
  levelBand,
  LevelBand,
  NIOSH_LIMIT_DB,
  toSpl,
} from '../../../utils/soundLevel';

/** The graph's fixed scale, so one session reads against another. */
const MIN_DB = 30;
const MAX_DB = 110;
const HEIGHT = 88;
const BAR_GAP = 1;

type Props = {
  history: HistoryPoint[];
  calibrationDb: number;
  /** The time the right edge stands for: the latest reading. */
  endAt: number;
};

export function bandColor(band: LevelBand, COLORS: ColorScheme): string {
  switch (band) {
    case 'harmful':
    case 'loud':
      return COLORS.ERROR;
    case 'moderate':
      return COLORS.ACCENT;
    default:
      return COLORS.SECONDARY_ACCENT;
  }
}

/**
 * The last minute of readings as bars, one per half second, on a fixed
 * 30–110 dB scale with NIOSH's 85 dB line across it. Each bar is the loudest
 * moment in its half second, so short bangs aren't averaged away.
 */
export default function LevelHistoryChart({
  history,
  calibrationDb,
  endAt,
}: Props) {
  const COLORS = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  const slots = HISTORY_WINDOW_MS / HISTORY_BUCKET_MS;
  const slotWidth = width / slots;
  const lastBucket = endAt - (endAt % HISTORY_BUCKET_MS);
  const yFor = (db: number) => {
    const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
    return HEIGHT - ((clamped - MIN_DB) / (MAX_DB - MIN_DB)) * HEIGHT;
  };
  const limitY = yFor(NIOSH_LIMIT_DB);

  return (
    <View
      style={styles.frame}
      onLayout={onLayout}
      accessible
      accessibilityLabel="Sound level over the last minute"
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {history.map((point) => {
            const slot =
              slots -
              1 -
              Math.round((lastBucket - point.at) / HISTORY_BUCKET_MS);
            if (slot < 0) {
              return null;
            }
            const db = toSpl(point.maxDbfs, calibrationDb);
            const y = yFor(db);
            return (
              <Rect
                key={point.at}
                x={slot * slotWidth}
                y={y}
                width={Math.max(1, slotWidth - BAR_GAP)}
                height={Math.max(1, HEIGHT - y)}
                rx={Math.min(1.5, slotWidth / 2)}
                fill={bandColor(levelBand(db), COLORS)}
              />
            );
          })}
          <Line
            x1={0}
            x2={width}
            y1={limitY}
            y2={limitY}
            stroke={COLORS.ERROR}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
          <SvgText
            x={width - 2}
            y={limitY - 4}
            fontSize={10}
            fontWeight="600"
            textAnchor="end"
            fill={COLORS.ERROR}
          >
            {`${NIOSH_LIMIT_DB} dB`}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: HEIGHT,
    width: '100%',
  },
});
