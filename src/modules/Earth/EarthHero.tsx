import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import ModuleHero from '../../components/ModuleHero';
import { useTheme } from '../../hooks/useTheme';
import {
  useAstronomyEventStore,
  useBarometerStore,
  useCoreStore,
  useSettingsStore,
} from '../../stores/StoreContext';
import {
  dayLengthText,
  nextFullMoonText,
  nextSkyEventText,
  pressureHeadline,
  sparklineSamples,
} from './earthHero';

const SPARK_WIDTH = 78;
const SPARK_HEIGHT = 44;

/**
 * Earth's hero: what the air pressure is doing, as a forecast, with the last
 * 12 hours drawn beside it. Home already shows the reading; this says what
 * it means. Below: the next sky event, today's day length and its change,
 * and the next full moon.
 */
const EarthHero = observer(() => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const barometer = useBarometerStore();
  const astronomy = useAstronomyEventStore();
  const core = useCoreStore();
  const settings = useSettingsStore();
  const [now, setNow] = useState(() => new Date());

  // Everything here moves on the scale of minutes.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const pressure =
    !barometer.available && !barometer.loading && !barometer.paused
      ? {
          headline: 'Barometer unavailable',
          detail:
            barometer.error ?? 'This device cannot provide pressure readings.',
          tone: 'muted' as const,
        }
      : pressureHeadline(
          barometer.history,
          barometer.currentPressure,
          barometer.paused,
          settings.measurementSystem,
          now.getTime(),
        );
  const fix = core.lastFix?.coords;
  const dayLength = fix
    ? dayLengthText(fix.latitude, fix.longitude, now)
    : null;
  const nextEvent = nextSkyEventText(astronomy.getNextAstronomyEvent(365), now);
  const samples = sparklineSamples(barometer.history, now.getTime());

  return (
    <ModuleHero
      eyebrow="Pressure trend"
      headline={pressure.headline}
      headlineTone={pressure.tone}
      detail={pressure.detail}
      onPress={() => navigation.navigate('BarometricPressure')}
      graphic={
        samples.length >= 2 && !barometer.paused ? (
          <Sparkline
            values={samples.map((s) => s.pressure)}
            color={COLORS.BRAND}
            baseline={COLORS.BORDER}
          />
        ) : null
      }
      stats={[
        {
          label: 'Next event',
          value: nextEvent ?? 'None this year',
          onPress: () => navigation.navigate('SkyEvents'),
        },
        {
          label: 'Daylight',
          value: dayLength ?? (fix ? '—' : 'Needs GPS'),
          tone: dayLength ? undefined : 'muted',
          onPress: () => navigation.navigate('SunTime'),
        },
        {
          label: 'Full moon',
          value: nextFullMoonText(now),
          onPress: () => navigation.navigate('LunarCycles'),
        },
      ]}
    />
  );
});

/** A pressure line over the last 12 hours, scaled to its own range. */
function Sparkline({
  values,
  color,
  baseline,
}: {
  values: number[];
  color: string;
  baseline: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // At least 2 hPa of range, so a steady day draws flat rather than noisy.
  const span = Math.max(max - min, 2);
  const mid = (max + min) / 2;
  const top = 4;
  const usable = SPARK_HEIGHT - top * 2;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * SPARK_WIDTH;
      const y = top + usable / 2 - ((value - mid) / span) * usable;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={SPARK_WIDTH} height={SPARK_HEIGHT}>
      <Path
        d={`M0 ${SPARK_HEIGHT - 1} H${SPARK_WIDTH}`}
        stroke={baseline}
        strokeWidth={1}
      />
      <Path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default EarthHero;
