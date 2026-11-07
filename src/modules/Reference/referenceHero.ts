import * as SunCalc from 'suncalc';
import {
  getPressureTrend,
  hasSufficientDataForTrend,
  PressureTrend,
} from '../../utils/barometricPressure';
import {
  COLD_BELOW_C,
  formatTemperature,
} from '../../utils/batteryTemperature';
import { TREND_WINDOW_MS } from '../Earth/earthHero';
import type { HeroTone } from '../../components/ModuleHero';
import type { MeasurementSystem } from '../../stores/SettingsStore';

const MINUTE_MS = 60 * 1000;
/** How close sunset has to be before the hero turns to shelter. */
export const SUNSET_SOON_MS = 60 * MINUTE_MS;

/** Entries the hero points at. Each is checked against the data in tests. */
export const SUGGESTED_ENTRY_IDS = {
  hypothermia: 'cold_weather_hypothermia_prevention',
  storm: 'weather_storm_indicators',
  shelter: 'shelter_priorities_survive_the_night',
  winter: 'season_winter_survival_basics',
  spring: 'season_spring_thaw_hazards',
  summer: 'season_summer_heat_management',
  fall: 'season_fall_transition_weather',
  cpr: 'emergency_cardiac_arrest_cpr',
} as const;

export type Conditions = {
  now: Date;
  coldMode: boolean;
  /** Battery temperature in °C; null on iOS or before the first sample. */
  batteryTemperatureC: number | null;
  /** The 3-hour pressure trend; null while there's too little history. */
  pressureTrend: PressureTrend | null;
  latitude: number | null;
  longitude: number | null;
  system: MeasurementSystem;
};

export type Suggestion = {
  id: string;
  /** Why this entry, now: shown under its title. */
  reason: string;
  tone?: HeroTone;
};

type Season = 'winter' | 'spring' | 'summer' | 'fall';

/**
 * The meteorological season at a date: whole months, flipped south of the
 * equator. With no fix the northern hemisphere is assumed.
 */
export function seasonAt(date: Date, latitude: number | null): Season {
  const seasons: Season[] = ['winter', 'spring', 'summer', 'fall'];
  // Dec–Feb is index 0, Mar–May 1, Jun–Aug 2, Sep–Nov 3.
  const index = Math.floor(((date.getMonth() + 1) % 12) / 3);
  const flip = latitude != null && latitude < 0 ? 2 : 0;
  return seasons[(index + flip) % 4];
}

/** Milliseconds until today's sunset, or null when it has passed or won't come. */
export function msUntilSunset(
  now: Date,
  latitude: number,
  longitude: number,
): number | null {
  const sunset = SunCalc.getTimes(now, latitude, longitude).sunset;
  const ms = sunset.getTime() - now.getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * Which reference entry fits right now. The first rule that applies wins:
 * cold (Cold mode on, or a battery cold enough to say the phone is out in
 * it), then falling pressure, then sunset within the hour, then the season.
 */
export function suggestEntry(conditions: Conditions): Suggestion {
  const { now, latitude, longitude } = conditions;

  if (conditions.coldMode) {
    return {
      id: SUGGESTED_ENTRY_IDS.hypothermia,
      reason: 'Cold mode is on',
      tone: 'fair',
    };
  }
  const battery = conditions.batteryTemperatureC;
  if (battery != null && battery <= COLD_BELOW_C) {
    return {
      id: SUGGESTED_ENTRY_IDS.hypothermia,
      reason: `Battery at ${formatTemperature(battery, conditions.system)}`,
      tone: 'fair',
    };
  }
  if (conditions.pressureTrend === 'Falling') {
    return {
      id: SUGGESTED_ENTRY_IDS.storm,
      reason: 'Pressure falling',
      tone: 'fair',
    };
  }
  if (latitude != null && longitude != null) {
    const ms = msUntilSunset(now, latitude, longitude);
    if (ms != null && ms <= SUNSET_SOON_MS) {
      const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
      return {
        id: SUGGESTED_ENTRY_IDS.shelter,
        reason: `Sunset in ${minutes} min`,
        tone: 'fair',
      };
    }
  }
  const season = seasonAt(now, latitude);
  return {
    id: SUGGESTED_ENTRY_IDS[season],
    reason: `In season: ${season}`,
  };
}

type Sample = { timestamp: number; pressure: number };

/**
 * The barometer screen's 3-hour trend, or null when paused or when there
 * isn't enough history to call one.
 */
export function currentPressureTrend(
  history: readonly Sample[],
  paused: boolean,
  now: number = Date.now(),
): PressureTrend | null {
  if (paused) return null;
  const window = history.filter((s) => s.timestamp >= now - TREND_WINDOW_MS);
  if (!hasSufficientDataForTrend(window, TREND_WINDOW_MS)) return null;
  return getPressureTrend(window.map((s) => s.pressure));
}

/** "None yet", "1 saved", "4 saved". */
export function bookmarksText(count: number): string {
  return count === 0 ? 'None yet' : `${count} saved`;
}
