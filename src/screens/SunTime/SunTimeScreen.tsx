import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
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
import ScreenBody from '../../components/ScreenBody';
import SectionEyebrow from '../../components/SectionEyebrow';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { useCoreStore } from '../../stores/StoreContext';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../../theme';
import { withAlpha } from '../../theme/colorUtils';
import { formatDuration, getSolarSnapshot } from '../../utils/sunTimes';
import { formatTime } from '../../utils/timeFormat';

// Constants for location polling
const LOCATION_WAIT_TIMEOUT_MS = 3000;
const LOCATION_CHECK_INTERVAL_MS = 500;

const CHART_HEIGHT = 132;
/** Vertical room left below the arc for the horizon rule and its labels. */
const CHART_BASELINE = 104;
const CHART_PEAK = 18;

/**
 * Sun Times.
 *
 * The screen used to be nine identical gradient cards — one per event, each
 * label weighted the same, so "Sunset" and "Night End" competed equally for
 * attention. It now leads with the one number that changes what you do next:
 * how much daylight is left. The individual times follow as a grouped list.
 *
 * Every value is computed on-device from the last fix.
 */
const SunTimeScreen = observer(() => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const footerClearance = useFooterClearance();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [chartWidth, setChartWidth] = useState(0);

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

  const fix = core.lastFix;
  const snapshot = fix
    ? getSolarSnapshot(fix.coords.latitude, fix.coords.longitude, now)
    : null;

  const handleChartLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
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
    <ScreenBody>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <SectionHeader title="Sun Times" subtitle={coordinates} />

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
                {
                  backgroundColor: COLORS.SURFACE,
                  borderColor: COLORS.BORDER,
                },
              ]}
            >
              <View style={styles.daylightHeader}>
                <SectionEyebrow>Daylight remaining</SectionEyebrow>
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
                      d={`M${arcPoint(snapshot.progress).x} ${CHART_PEAK - 10} V${CHART_BASELINE}`}
                      stroke={COLORS.MUTED}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Circle
                      cx={arcPoint(snapshot.progress).x}
                      cy={arcPoint(snapshot.progress).y}
                      r={13}
                      fill={withAlpha(COLORS.ACCENT, 0.2)}
                    />
                    <Circle
                      cx={arcPoint(snapshot.progress).x}
                      cy={arcPoint(snapshot.progress).y}
                      r={7}
                      fill={COLORS.ACCENT}
                    />
                  </Svg>
                )}
              </View>

              <View style={styles.milestones}>
                <Milestone label="Dawn" value={formatTime(snapshot.dawn)} />
                <View
                  style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]}
                />
                <Milestone
                  label="Solar noon"
                  value={formatTime(snapshot.solarNoon)}
                />
                <View
                  style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]}
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
      </ScrollView>
    </ScreenBody>
  );
});

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
          style={[styles.eventSeparator, { backgroundColor: COLORS.SEPARATOR }]}
        />
      )}
    </View>
  );
}

export default SunTimeScreen;

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
  },
  centerContainer: {
    alignItems: 'center',
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
    borderWidth: 1,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    paddingTop: 15,
    marginBottom: SPACING.xl,
  },
  daylightHeader: {
    paddingHorizontal: 17,
  },
  daylightValue: {
    fontSize: 34,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.8,
  },
  chart: {
    width: '100%',
    height: CHART_HEIGHT,
    marginTop: SPACING.sm,
  },
  milestones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingBottom: 14,
    paddingTop: 12,
  },
  milestone: {
    flex: 1,
    gap: 3,
  },
  milestoneLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  milestoneValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  rule: {
    width: hairline,
    alignSelf: 'stretch',
    marginHorizontal: SPACING.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 48,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventLabel: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
  },
  eventValue: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  eventSeparator: {
    height: hairline,
    marginLeft: 35,
  },
});
