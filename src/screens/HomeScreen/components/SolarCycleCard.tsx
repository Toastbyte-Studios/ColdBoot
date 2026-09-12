import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as SunCalc from 'suncalc';
import { Text } from '../../../components/ScaledText';
import SectionEyebrow from '../../../components/SectionEyebrow';
import { useTheme } from '../../../hooks/useTheme';
import { useBarometerStore, useCoreStore } from '../../../stores/StoreContext';
import { RADIUS, SPACING } from '../../../theme';
import { getLunarPhaseName } from '../../../utils/lunarPhase';
import { getSolarSnapshot, formatDuration } from '../../../utils/sunTimes';
import { formatTime } from '../../../utils/timeFormat';

const ARC_WIDTH = 78;
const ARC_HEIGHT = 54;
/** Baseline the sun travels above, leaving room for the ground line beneath. */
const ARC_BASELINE = 44;
const ARC_PEAK = 8;

/** hPa → inches of mercury. */
const HPA_TO_INHG = 0.02952998;
/** Pressure change over this window decides the trend arrow. */
const TREND_WINDOW_MS = 3 * 60 * 60 * 1000;
/** inHg change below this reads as steady rather than rising or falling. */
const TREND_THRESHOLD_INHG = 0.02;

/** Point on the sun's arc at `progress` (0 = sunrise, 1 = sunset). */
function arcPoint(progress: number): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, progress));
  return {
    x: t * ARC_WIDTH,
    // A parabola through (0, baseline), (0.5, peak), (1, baseline).
    y: ARC_BASELINE - 4 * (ARC_BASELINE - ARC_PEAK) * t * (1 - t),
  };
}

/** SVG path for the arc between two progress values. */
function arcPath(from: number, to: number): string {
  const steps = 24;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const { x, y } = arcPoint(from + ((to - from) * i) / steps);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * Home's one time-critical fact: where the sun is, and what is about to happen
 * to it.
 *
 * Everything here is computed from the last GPS fix and the device clock, so
 * it keeps working with no signal — which is the only condition this app
 * assumes. Renders nothing until there is a fix to compute from, rather than
 * showing placeholder times that would be wrong.
 */
const SolarCycleCard = observer(() => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const barometer = useBarometerStore();
  const [now, setNow] = useState(() => new Date());

  // The countdown is only ever read to the minute.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fix = core.lastFix;
  const snapshot = fix
    ? getSolarSnapshot(fix.coords.latitude, fix.coords.longitude, now)
    : null;

  if (!snapshot) {
    return null;
  }

  const isDaylight =
    now >= snapshot.sunrise && now < snapshot.sunset ? true : false;
  const headlineEvent = isDaylight ? 'Sunset' : 'Sunrise';
  const headlineTime = isDaylight ? snapshot.sunset : snapshot.sunrise;

  // Split the meridiem so it can sit smaller than the time itself.
  const formatted = formatTime(headlineTime);
  const [clock, meridiem] = formatted.split(' ');

  const untilMs = headlineTime.getTime() - now.getTime();
  const countdown =
    untilMs > 0 ? `in ${formatDuration(untilMs)}` : `${headlineEvent} now`;
  const goldenHour = `golden hour from ${formatTime(snapshot.goldenHour)}`;

  const pressure = barometer.currentPressure;
  const pressureText =
    pressure == null ? '—' : `${(pressure * HPA_TO_INHG).toFixed(2)} in`;

  // Compare the newest reading against the oldest inside the trend window.
  const trendArrow = (() => {
    if (pressure == null || barometer.history.length < 2) return '';
    const cutoff = now.getTime() - TREND_WINDOW_MS;
    const earlier = barometer.history.find(
      (sample) => sample.timestamp >= cutoff,
    );
    if (!earlier) return '';
    const delta = (pressure - earlier.pressure) * HPA_TO_INHG;
    if (Math.abs(delta) < TREND_THRESHOLD_INHG) return '';
    return delta > 0 ? ' ↑' : ' ↓';
  })();

  const moon = SunCalc.getMoonIllumination(now);
  const moonText = `${getLunarPhaseName(moon.phase)} ${Math.round(
    moon.fraction * 100,
  )}%`;

  const sun = arcPoint(snapshot.progress);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: COLORS.SURFACE, borderColor: COLORS.BORDER },
      ]}
    >
      <View style={styles.headlineRow}>
        <View style={styles.headline}>
          <SectionEyebrow>Solar cycle</SectionEyebrow>
          <Text style={[styles.time, { color: COLORS.PRIMARY_DARK }]}>
            {headlineEvent} {clock}
            {meridiem ? <Text style={styles.meridiem}> {meridiem}</Text> : null}
          </Text>
          <Text style={[styles.detail, { color: COLORS.MUTED }]}>
            {countdown} · {goldenHour}
          </Text>
        </View>

        <Svg width={ARC_WIDTH} height={ARC_HEIGHT} accessibilityElementsHidden>
          {/* Full arc, dashed: the day the sun has yet to travel. */}
          <Path
            d={arcPath(0, 1)}
            stroke={COLORS.BORDER}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            fill="none"
          />
          {/* Solid over the portion already traversed. */}
          <Path
            d={arcPath(0, snapshot.progress)}
            stroke={COLORS.BRAND}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M0 ${ARC_BASELINE + 4} H${ARC_WIDTH}`}
            stroke={COLORS.BORDER}
            strokeWidth={1.5}
          />
          <Circle cx={sun.x} cy={sun.y} r={5.5} fill={COLORS.ACCENT} />
        </Svg>
      </View>

      <View style={[styles.divider, { backgroundColor: COLORS.SEPARATOR }]} />

      <View style={styles.stats}>
        <Stat label="Pressure" value={`${pressureText}${trendArrow}`} />
        <View style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]} />
        <Stat label="Moon" value={moonText} />
        <View style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]} />
        <Stat
          label="Fix"
          value={fix ? 'GPS locked' : 'No fix'}
          tone={fix ? COLORS.SECONDARY_ACCENT : COLORS.MUTED}
        />
      </View>
    </View>
  );
});

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const COLORS = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: COLORS.MUTED }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.statValue, { color: tone ?? COLORS.PRIMARY_DARK }]}>
        {value}
      </Text>
    </View>
  );
}

export default SolarCycleCard;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    paddingTop: 15,
    paddingHorizontal: 17,
    paddingBottom: 13,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headline: {
    flex: 1,
  },
  time: {
    fontSize: 27,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.5,
  },
  meridiem: {
    fontSize: 15,
    fontFamily: 'Bitter-Bold',
  },
  detail: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth,
    // Full-bleed: cancels the card's horizontal padding.
    marginHorizontal: -17,
    marginTop: 13,
    marginBottom: 11,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  rule: {
    width: StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
