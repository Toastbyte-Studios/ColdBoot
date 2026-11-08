import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import GroupContainer from '../../components/GroupContainer';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useCoreStore } from '../../stores/StoreContext';
import {
  RADIUS,
  SCREEN_GUTTER,
  SCREEN_INSET,
  SPACING,
  TEXT_GUTTER,
} from '../../theme';
import { withAlpha } from '../../theme/colorUtils';
import { formatDuration, getSolarSnapshot } from '../../utils/sunTimes';
import { formatTime } from '../../utils/timeFormat';

const isAndroid = Platform.OS === 'android';

// Constants for location polling
const LOCATION_WAIT_TIMEOUT_MS = 3000;
const LOCATION_CHECK_INTERVAL_MS = 500;

const CHART_HEIGHT = 132;
/** Vertical room left below the arc for the horizon rule and its labels. */
const CHART_BASELINE = 104;
const CHART_PEAK = 18;

/** How long the sun takes to climb from the horizon to where it is now. */
export const SUN_RISE_DURATION_MS = 2800;

/**
 * Horizontal space around the chart, used to estimate its width for the first
 * frame. iOS: screen inset and gutter each side (as `KnotStepCarousel`), plus
 * the card's 1pt outline. Android: the card's gutter each side; StackScreen's
 * content is full-bleed there and Material cards have no outline.
 */
const ESTIMATED_CHART_INSET = isAndroid
  ? SCREEN_GUTTER * 2
  : (SCREEN_INSET + SCREEN_GUTTER) * 2 + 2;

/**
 * Sun Times.
 *
 * The screen used to be nine identical gradient cards — one per event, each
 * label weighted the same, so "Sunset" and "Night End" competed equally for
 * attention. It now leads with the one number that changes what you do next:
 * how much daylight is left. The individual times follow as a grouped list.
 *
 * Every value is computed on-device from the last fix.
 *
 * The design's "Alert me at dusk" button is deliberately absent. Solar alerts
 * are not user-configurable — `SolarCycleNotificationStore` hardcodes dawn,
 * dusk, sunrise and sunset to on, and the alerts sheet says as much in so many
 * words — so the button would be a control with nothing to control.
 */
const SunTimeScreen = observer(() => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const { width: screenWidth } = useWindowDimensions();
  const [measuredChartWidth, setMeasuredChartWidth] = useState<number | null>(
    null,
  );
  // The arc used to wait for onLayout and draw nothing until it reported a
  // width. On a fresh push that first report could be missing or zero, so the
  // hero chart stayed blank until the screen was opened a second time. Draw
  // from an estimate straight away; the measured width replaces it when it
  // arrives.
  const chartWidth =
    measuredChartWidth ?? Math.max(0, screenWidth - ESTIMATED_CHART_INSET);

  useEffect(() => {
    let isMounted = true;

    const waitForLocation = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!core.lastFix) {
          let elapsed = 0;
          while (
            !core.lastFix &&
            elapsed < LOCATION_WAIT_TIMEOUT_MS &&
            isMounted
          ) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, LOCATION_CHECK_INTERVAL_MS),
            );
            elapsed += LOCATION_CHECK_INTERVAL_MS;
          }
        }

        if (!isMounted) return;

        if (!core.lastFix) {
          setError('Unable to get location. Please enable location services.');
          return;
        }

        setNow(new Date());
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? `Error: ${err.message}`
            : 'Invalid location data. Please try again.',
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    waitForLocation();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the "remaining" figure honest without re-rendering every second.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (core.lastFix) {
      setLoading(false);
      setError(null);
      setNow(new Date());
    }
  }, [core.lastFix]);

  const fix = core.lastFix;
  const snapshot = fix
    ? getSolarSnapshot(fix.coords.latitude, fix.coords.longitude, now)
    : null;
  const sunProgress = useSunRise(snapshot?.progress ?? null);

  const handleChartLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    // Ignore an empty measurement rather than letting it hide the chart.
    if (width > 0 && width !== measuredChartWidth) {
      setMeasuredChartWidth(width);
    }
  };

  const coordinates = fix
    ? `${Math.abs(fix.coords.latitude).toFixed(4)}° ${
        fix.coords.latitude >= 0 ? 'N' : 'S'
      }, ${Math.abs(fix.coords.longitude).toFixed(4)}° ${
        fix.coords.longitude >= 0 ? 'E' : 'W'
      } · local`
    : undefined;

  /** Point on the day arc at `progress`, in chart coordinates. */
  const arcPoint = (progress: number) => {
    const t = Math.min(1, Math.max(0, progress));
    return {
      x: t * chartWidth,
      y: CHART_BASELINE - 4 * (CHART_BASELINE - CHART_PEAK) * t * (1 - t),
    };
  };

  const arcPath = (from: number, to: number) => {
    const steps = 40;
    const points: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const { x, y } = arcPoint(from + ((to - from) * i) / steps);
      points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(' ');
  };

  return (
    <StackScreen title="Sun Times" subtitle={coordinates}>
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.ACCENT} />
          <Text style={[styles.centerText, { color: COLORS.MUTED }]}>
            Getting location…
          </Text>
        </View>
      )}

      {!loading && (error || !snapshot) && (
        <View style={styles.centerContainer}>
          <Text style={[styles.centerText, { color: COLORS.MUTED }]}>
            {error ??
              'Sun times are unavailable for this location today — the sun may not rise or set here.'}
          </Text>
        </View>
      )}

      {!loading && !error && snapshot && (
        <>
          <View
            style={[
              styles.daylightCard,
              isAndroid
                ? { backgroundColor: COLORS.SURFACE_CONTAINER }
                : [
                    styles.outlined,
                    {
                      backgroundColor: COLORS.SURFACE,
                      borderColor: COLORS.BORDER,
                    },
                  ],
            ]}
          >
            <View style={styles.daylightHeader}>
              <SectionEyebrow inline>Daylight remaining</SectionEyebrow>
              <Text
                style={[styles.daylightValue, { color: COLORS.PRIMARY_DARK }]}
              >
                {formatDuration(snapshot.daylightRemainingMs)}
              </Text>
            </View>

            <View onLayout={handleChartLayout} style={styles.chart}>
              {chartWidth > 0 && (
                <Svg
                  width={chartWidth}
                  height={CHART_HEIGHT}
                  accessibilityElementsHidden
                >
                  <Defs>
                    <LinearGradient id="daylight" x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0"
                        stopColor={COLORS.ACCENT}
                        stopOpacity={0.22}
                      />
                      <Stop
                        offset="1"
                        stopColor={COLORS.ACCENT}
                        stopOpacity={0}
                      />
                    </LinearGradient>
                  </Defs>

                  {/* Filled area under the day arc. */}
                  <Path
                    d={`${arcPath(0, 1)} L${chartWidth} ${CHART_BASELINE} L0 ${CHART_BASELINE} Z`}
                    fill="url(#daylight)"
                  />
                  <Path
                    d={arcPath(0, 1)}
                    stroke={COLORS.ACCENT}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Horizon. */}
                  <Path
                    d={`M0 ${CHART_BASELINE} H${chartWidth}`}
                    stroke={COLORS.BORDER}
                    strokeWidth={1.5}
                  />
                  {/* Now. */}
                  <Path
                    d={`M${arcPoint(sunProgress).x} ${CHART_PEAK - 10} V${CHART_BASELINE}`}
                    stroke={COLORS.MUTED}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <Circle
                    cx={arcPoint(sunProgress).x}
                    cy={arcPoint(sunProgress).y}
                    r={13}
                    fill={withAlpha(COLORS.ACCENT, 0.2)}
                  />
                  <Circle
                    cx={arcPoint(sunProgress).x}
                    cy={arcPoint(sunProgress).y}
                    r={7}
                    fill={COLORS.ACCENT}
                  />
                </Svg>
              )}
            </View>

            <View style={styles.milestones}>
              <Milestone label="Dawn" value={formatTime(snapshot.dawn)} />
              <View
                style={[
                  styles.rule,
                  {
                    backgroundColor: isAndroid
                      ? COLORS.OUTLINE_VARIANT
                      : COLORS.SEPARATOR,
                  },
                ]}
              />
              <Milestone
                label="Solar noon"
                value={formatTime(snapshot.solarNoon)}
              />
              <View
                style={[
                  styles.rule,
                  {
                    backgroundColor: isAndroid
                      ? COLORS.OUTLINE_VARIANT
                      : COLORS.SEPARATOR,
                  },
                ]}
              />
              <Milestone label="Dusk" value={formatTime(snapshot.dusk)} />
            </View>
          </View>

          <SectionEyebrow>Today</SectionEyebrow>
          <GroupContainer>
            <EventRow
              label="Sunrise"
              value={formatTime(snapshot.sunrise)}
              dot={COLORS.ACCENT}
            />
            <EventRow
              label="Golden hour"
              value={formatTime(snapshot.goldenHour)}
              dot={COLORS.BRAND}
            />
            <EventRow
              label="Sunset"
              value={formatTime(snapshot.sunset)}
              dot={COLORS.SECONDARY_ACCENT}
            />
            <EventRow
              label="Day length"
              value={formatDuration(
                snapshot.sunset.getTime() - snapshot.sunrise.getTime(),
              )}
              dot={COLORS.MUTED}
              isLast
            />
          </GroupContainer>
        </>
      )}
    </StackScreen>
  );
});

/**
 * The sun's position on the arc for drawing, animated on first show: it starts
 * on the horizon at the sunrise point and climbs along the arc to `target`.
 *
 * Plays once per visit. `target` moves while the screen is open (the
 * per-minute tick, each new GPS fix), so the animation keys on the chart
 * becoming drawable rather than on the value, and only follows `target`
 * directly once the climb has finished. With Reduce Motion on, the sun is
 * simply placed.
 */
function useSunRise(target: number | null): number {
  const ready = target != null;
  const targetRef = useRef(target ?? 0);
  targetRef.current = target ?? 0;
  const [rising, setRising] = useState(true);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;
    const value = new Animated.Value(0);
    const listener = value.addListener(({ value: v }) => setShown(v));
    const finish = () => {
      if (!cancelled) setRising(false);
    };

    setRising(true);
    setShown(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion || targetRef.current <= 0) {
          finish();
          return;
        }
        animation = Animated.timing(value, {
          toValue: targetRef.current,
          duration: SUN_RISE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          // Drives SVG coordinates through state; the native driver can't.
          useNativeDriver: false,
        });
        animation.start(finish);
      });

    return () => {
      cancelled = true;
      animation?.stop();
      value.removeListener(listener);
    };
  }, [ready]);

  return rising ? shown : targetRef.current;
}

/** One cell of the three-up row beneath the chart. */
function Milestone({ label, value }: { label: string; value: string }) {
  const COLORS = useTheme();
  return (
    <View style={styles.milestone}>
      <Text style={[styles.milestoneLabel, { color: COLORS.MUTED }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.milestoneValue, { color: COLORS.PRIMARY_DARK }]}>
        {value}
      </Text>
    </View>
  );
}

function EventRow({
  label,
  value,
  dot,
  isLast = false,
}: {
  label: string;
  value: string;
  dot: string;
  isLast?: boolean;
}) {
  const COLORS = useTheme();
  return (
    <View>
      <View style={styles.eventRow}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[styles.eventLabel, { color: COLORS.PRIMARY_DARK }]}>
          {label}
        </Text>
        <Text style={[styles.eventValue, { color: COLORS.PRIMARY_DARK }]}>
          {value}
        </Text>
      </View>
      {!isLast && (
        <View
          style={[
            styles.eventSeparator,
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

export default SunTimeScreen;

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
    justifyContent: 'center',
    paddingVertical: 48,
    gap: SPACING.md,
  },
  centerText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  daylightCard: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    paddingTop: isAndroid ? 16 : 15,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.xl,
  },
  outlined: {
    borderWidth: 1,
  },
  daylightHeader: {
    paddingHorizontal: isAndroid ? 18 : 17,
  },
  daylightValue: {
    fontSize: 34,
    fontFamily: 'Bitter-Bold',
    letterSpacing: isAndroid ? 0 : -0.8,
  },
  chart: {
    width: '100%',
    height: CHART_HEIGHT,
    marginTop: SPACING.sm,
  },
  milestones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isAndroid ? 18 : 17,
    paddingBottom: 14,
    paddingTop: 12,
  },
  milestone: {
    flex: 1,
    gap: 3,
  },
  milestoneLabel: {
    fontSize: isAndroid ? 10.5 : 9.5,
    fontWeight: '600',
    letterSpacing: isAndroid ? 0.7 : 0.6,
  },
  milestoneValue: {
    fontSize: 15,
    fontWeight: isAndroid ? '500' : '600',
  },
  rule: {
    width: isAndroid ? 1 : hairline,
    alignSelf: 'stretch',
    marginHorizontal: SPACING.md,
  },
  eventRow: {
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
  eventLabel: {
    flex: 1,
    fontSize: isAndroid ? 16 : 15.5,
    fontWeight: isAndroid ? '400' : '500',
  },
  eventValue: {
    fontSize: isAndroid ? 16 : 15.5,
    fontWeight: isAndroid ? '500' : '600',
  },
  eventSeparator: {
    height: isAndroid ? 1 : hairline,
    marginLeft: isAndroid ? 46 : 35,
  },
});
