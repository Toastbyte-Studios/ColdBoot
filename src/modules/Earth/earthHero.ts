import * as SunCalc from 'suncalc';
import {
  getPressureTrend,
  getTrendInterpretation,
  hasSufficientDataForTrend,
  MIN_WINDOW_COVERAGE,
} from '../../utils/barometricPressure';
import { formatDaysUntil } from '../../utils/formatDaysUntil';
import { displayPressure } from '../../utils/unitConversions';
import type { HeroTone } from '../../components/ModuleHero';
import type { MeasurementSystem } from '../../stores/SettingsStore';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The Barometric Pressure screen's default window; the hero agrees with it. */
export const TREND_WINDOW_MS = 3 * HOUR_MS;
/** How much history the sparkline draws. */
export const SPARKLINE_WINDOW_MS = 12 * HOUR_MS;

type Sample = { timestamp: number; pressure: number };

export type PressureHeadline = {
  headline: string;
  detail: string;
  tone?: HeroTone;
};

/**
 * What the air pressure is doing, said as a forecast. Uses the barometer
 * screen's own trend rules (3-hour window, ±1 hPa) so the two never disagree.
 */
export function pressureHeadline(
  history: readonly Sample[],
  current: number | null,
  paused: boolean,
  system: MeasurementSystem,
  now: number = Date.now(),
): PressureHeadline {
  if (paused) {
    return {
      headline: 'Barometer paused',
      detail: 'Cold mode is saving battery. Turn it off to resume readings.',
      tone: 'muted',
    };
  }
  if (current == null) {
    return {
      headline: 'No reading yet',
      detail: 'The pressure trend appears once the sensor reports.',
      tone: 'muted',
    };
  }
  const reading = displayPressure(current, system);
  const window = history.filter((s) => s.timestamp >= now - TREND_WINDOW_MS);
  if (!hasSufficientDataForTrend(window, TREND_WINDOW_MS)) {
    const hours = (TREND_WINDOW_MS * MIN_WINDOW_COVERAGE) / HOUR_MS;
    return {
      headline: reading,
      detail: `The trend shows after about ${hours} h of readings.`,
    };
  }
  const trend = getPressureTrend(window.map((s) => s.pressure));
  return {
    headline: `Pressure ${trend.toLowerCase()}`,
    detail: `${reading} · ${getTrendInterpretation(trend)}`,
    tone:
      trend === 'Falling' ? 'fair' : trend === 'Rising' ? 'good' : undefined,
  };
}

/** The last 12 hours of readings, for the sparkline. */
export function sparklineSamples(
  history: readonly Sample[],
  now: number = Date.now(),
): Sample[] {
  return history.filter((s) => s.timestamp >= now - SPARKLINE_WINDOW_MS);
}

/** "in 18 days" from formatDaysUntil's "In 18 days", for mid-sentence use. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "Supermoon · in 18 days", or null with nothing in the next year. */
export function nextSkyEventText(
  event: { label: string; date: Date } | null,
  now: Date = new Date(),
): string | null {
  if (!event) return null;
  return `${event.label} · ${lowerFirst(formatDaysUntil(event.date, now))}`;
}

/** "10 h 12 m" */
function formatSpan(ms: number): string {
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}

/**
 * Today's daylight, and how it compares with yesterday's: "10 h 12 m · −2 min".
 * Null where there's no sunrise or sunset (polar day or night).
 */
export function dayLengthText(
  latitude: number,
  longitude: number,
  now: Date = new Date(),
): string | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayTimes = SunCalc.getTimes(now, latitude, longitude);
  const yesterdayTimes = SunCalc.getTimes(yesterday, latitude, longitude);
  const timestamps = [
    todayTimes.sunrise,
    todayTimes.sunset,
    yesterdayTimes.sunrise,
    yesterdayTimes.sunset,
  ];
  if (!timestamps.every((time) => Number.isFinite(time.getTime()))) return null;
  const length = todayTimes.sunset.getTime() - todayTimes.sunrise.getTime();
  const before =
    yesterdayTimes.sunset.getTime() - yesterdayTimes.sunrise.getTime();
  if (!Number.isFinite(length) || !Number.isFinite(before)) return null;
  const change = Math.round((length - before) / 60000);
  const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
  return `${formatSpan(length)} · ${sign}${Math.abs(change)} min`;
}

/** Lunar Cycles' own full-moon window, so the two agree. */
const isFullMoon = (phase: number) => phase >= 0.47 && phase <= 0.53;

/**
 * When the next full moon is: "Tonight", "Tomorrow", "In 6 days". Steps a day
 * at a time, the way the Lunar Cycles screen finds it.
 */
export function nextFullMoonText(now: Date = new Date()): string {
  for (let day = 0; day <= 30; day++) {
    const date = new Date(now.getTime() + day * DAY_MS);
    if (isFullMoon(SunCalc.getMoonIllumination(date).phase)) {
      return day === 0 ? 'Tonight' : formatDaysUntil(date, now);
    }
  }
  return '—';
}
