/**
 * Weather Outlook Service
 *
 * Fetches and caches monthly SEAS5 (seasonal forecast) data from the
 * Open-Meteo Seasonal Forecast API.  No API key required.
 *
 * Cache strategy:
 *  - Keyed by (lat rounded to 1 dp, lon rounded to 1 dp, fetch_month)
 *  - Cached rows are valid for 30 days (aligns with the SEAS5 monthly update cycle)
 *  - Offline / failure: may fall back to returning cached data if available
 */

import { SQLiteDatabase } from '../types/database-types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One month of processed ensemble-mean forecast values. */
export interface MonthlyOutlookEntry {
  /** ISO date string for the first day of this forecast month, e.g. "2024-03" */
  month: string;
  /** Ensemble-mean monthly temperature in °C */
  tempMeanC: number;
  /**
   * Ensemble-mean monthly precipitation total in mm.
   * Open-Meteo's `precipitation_mean` monthly field is returned in aggregated
   * monthly units, so this stays a monthly total for the UI.
   */
  precipMm: number;
  /**
   * Ensemble-mean monthly snowfall total in cm.
   * Open-Meteo's `snowfall_mean` monthly field is returned in aggregated
   * monthly units, so this stays a monthly total for the UI.
   */
  snowfallCm: number;
  /** Ensemble-mean wind speed in km/h */
  windSpeedMeanKmh: number;
  /**
   * Ensemble-mean monthly shortwave radiation total in MJ/m².
   * Open-Meteo's `shortwave_radiation_mean` monthly field is returned in
   * aggregated monthly units, so this stays a monthly total for the UI.
   */
  shortwaveRadiationSum: number;
}

/** The full seasonal outlook for a location. */
export interface SeasonalOutlook {
  /** Rounded latitude used as cache key (1 decimal place) */
  lat: number;
  /** Rounded longitude used as cache key (1 decimal place) */
  lon: number;
  /** ISO date-time string of when this data was fetched */
  fetchedAt: string;
  /** ISO "YYYY-MM" of the month when the data was fetched */
  fetchMonth: string;
  /** Monthly forecast entries, up to 7 months */
  months: MonthlyOutlookEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEASONAL_API_BASE = 'https://seasonal-api.open-meteo.com/v1/seasonal';
const MONTHLY_VARIABLES = [
  'temperature_2m_mean',
  'precipitation_mean',
  'snowfall_mean',
  'wind_speed_10m_mean',
  'shortwave_radiation_mean',
];
/** Cache is valid for 30 days in milliseconds. */
export const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TABLE_NAME = 'seasonal_outlook_cache_v2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rounds a coordinate to 1 decimal place for cache bucketing. */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Returns an "YYYY-MM" string for the given Date (defaults to now). */
export function toYearMonth(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns true when the cached outlook should be refreshed.
 * @param cachedAt - ISO date-time string of the last fetch
 */
export function shouldRefresh(cachedAt: string): boolean {
  const fetchedMs = new Date(cachedAt).getTime();
  return Date.now() - fetchedMs > CACHE_MAX_AGE_MS;
}

function getMonthDays(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function canonicalUnit(unit: unknown): string {
  if (typeof unit !== 'string') {
    return '';
  }
  return unit
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll('²', '2')
    .replaceAll('³', '3');
}

function isPerDayUnit(unit: string): boolean {
  return (
    unit.includes('/day') || unit.includes('/d') || unit.includes('perday')
  );
}

function convertTemperatureToCelsius(value: number, unit: unknown): number {
  const normalizedUnit = canonicalUnit(unit);
  if (normalizedUnit.includes('f')) {
    return ((value - 32) * 5) / 9;
  }
  return value;
}

function convertPrecipitationToMm(
  value: number,
  unit: unknown,
  monthDays: number,
): number {
  const normalizedUnit = canonicalUnit(unit);
  const dayFactor = isPerDayUnit(normalizedUnit) ? monthDays : 1;

  if (normalizedUnit.includes('inch') || normalizedUnit === 'in') {
    return value * 25.4 * dayFactor;
  }
  if (normalizedUnit.includes('cm')) {
    return value * 10 * dayFactor;
  }
  return value * dayFactor;
}

function convertSnowfallToCm(
  value: number,
  unit: unknown,
  monthDays: number,
): number {
  const normalizedUnit = canonicalUnit(unit);
  const dayFactor = isPerDayUnit(normalizedUnit) ? monthDays : 1;

  if (normalizedUnit.includes('inch') || normalizedUnit === 'in') {
    return value * 2.54 * dayFactor;
  }
  if (normalizedUnit.includes('mm')) {
    return (value / 10) * dayFactor;
  }
  return value * dayFactor;
}

function convertWindSpeedToKmh(value: number, unit: unknown): number {
  const normalizedUnit = canonicalUnit(unit);
  if (normalizedUnit === 'ms' || normalizedUnit.includes('m/s')) {
    return value * 3.6;
  }
  if (normalizedUnit.includes('mph')) {
    return value * 1.609344;
  }
  if (normalizedUnit.includes('kn')) {
    return value * 1.852;
  }
  return value;
}

function convertShortwaveRadiationToMjPerSquareMetre(
  value: number,
  unit: unknown,
  monthDays: number,
): number {
  const normalizedUnit = canonicalUnit(unit);

  if (normalizedUnit.includes('w/m2')) {
    return (value * monthDays * 24 * 60 * 60) / 1_000_000;
  }
  if (normalizedUnit.includes('kwh/m2')) {
    return value * 3.6;
  }
  if (normalizedUnit.includes('mj/m2')) {
    return isPerDayUnit(normalizedUnit) ? value * monthDays : value;
  }

  return value;
}

function getMonthlySeries(
  monthly: Record<string, unknown>,
  variable: string,
): number[] {
  const values = monthly[variable];
  return Array.isArray(values)
    ? values.map((value) => (typeof value === 'number' ? value : 0))
    : [];
}

// ---------------------------------------------------------------------------
// API parsing
// ---------------------------------------------------------------------------

/**
 * Given the raw Open-Meteo `monthly` object, compute processed monthly entries
 * for each returned month. The ensemble-mean model returns one series per
 * variable, already averaged across members.
 */
export function parseMonthlyResponse(
  monthly: Record<string, unknown>,
  monthlyUnits: Record<string, unknown> = {},
): MonthlyOutlookEntry[] {
  const times = (monthly.time as string[]) ?? [];
  const temperatures = getMonthlySeries(monthly, 'temperature_2m_mean');
  const precipitation = getMonthlySeries(monthly, 'precipitation_mean');
  const snowfall = getMonthlySeries(monthly, 'snowfall_mean');
  const windSpeed = getMonthlySeries(monthly, 'wind_speed_10m_mean');
  const shortwaveRadiation = getMonthlySeries(
    monthly,
    'shortwave_radiation_mean',
  );

  return times.map((time, index) => {
    const month = time.slice(0, 7);
    const monthDays = getMonthDays(month);

    return {
      month,
      tempMeanC: convertTemperatureToCelsius(
        temperatures[index] ?? 0,
        monthlyUnits.temperature_2m_mean,
      ),
      precipMm: convertPrecipitationToMm(
        precipitation[index] ?? 0,
        monthlyUnits.precipitation_mean,
        monthDays,
      ),
      snowfallCm: convertSnowfallToCm(
        snowfall[index] ?? 0,
        monthlyUnits.snowfall_mean,
        monthDays,
      ),
      windSpeedMeanKmh: convertWindSpeedToKmh(
        windSpeed[index] ?? 0,
        monthlyUnits.wind_speed_10m_mean,
      ),
      shortwaveRadiationSum: convertShortwaveRadiationToMjPerSquareMetre(
        shortwaveRadiation[index] ?? 0,
        monthlyUnits.shortwave_radiation_mean,
        monthDays,
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Network fetch
// ---------------------------------------------------------------------------

/**
 * Fetches SEAS5 seasonal forecast data for the given coordinates.
 * Throws when the request fails, the API returns a non-OK HTTP response,
 * or the response payload is missing required data.
 *
 * Only coordinates rounded to 1 decimal place (about 11 km) leave the device.
 * SEAS5's grid is roughly 36 km, so full precision would not change the
 * forecast; it would only tell Open-Meteo more about where the user is. The
 * rounded values are also the cache key, so each cached row matches exactly
 * what was requested. Help's Privacy section describes this as "approximate
 * location"; keep the two in step.
 */
export async function fetchSeasonalData(
  lat: number,
  lon: number,
): Promise<SeasonalOutlook> {
  const roundedLat = roundCoord(lat);
  const roundedLon = roundCoord(lon);
  const params = new URLSearchParams({
    latitude: String(roundedLat),
    longitude: String(roundedLon),
    monthly: MONTHLY_VARIABLES.join(','),
    models: 'ecmwf_seas5_ensemble_mean',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'GMT',
  });

  const url = `${SEASONAL_API_BASE}?${params.toString()}`;
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    let reason: string | null = null;
    try {
      const errorJson = (await response.json()) as { reason?: unknown };
      if (typeof errorJson.reason === 'string' && errorJson.reason.trim()) {
        reason = errorJson.reason.trim();
      }
    } catch {
      reason = null;
    }

    const fallbackReason = response.statusText?.trim() ?? '';
    const detail =
      reason ?? (fallbackReason.length > 0 ? fallbackReason : null);
    throw new Error(
      detail
        ? `Open-Meteo seasonal API error ${response.status}: ${detail}`
        : `Open-Meteo seasonal API error ${response.status}`,
    );
  }

  const json = (await response.json()) as {
    monthly?: Record<string, unknown>;
    monthly_units?: Record<string, unknown>;
  };

  if (!json.monthly) {
    throw new Error('Open-Meteo seasonal API returned no monthly data');
  }

  const now = new Date();
  return {
    lat: roundedLat,
    lon: roundedLon,
    fetchedAt: now.toISOString(),
    fetchMonth: toYearMonth(now),
    months: parseMonthlyResponse(json.monthly, json.monthly_units),
  };
}

// ---------------------------------------------------------------------------
// SQLite cache
// ---------------------------------------------------------------------------

/** Initialises the cache table if it does not already exist. */
export async function initCacheTable(db: SQLiteDatabase): Promise<void> {
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
       cache_key   TEXT PRIMARY KEY NOT NULL,
       fetched_at  TEXT NOT NULL,
       data        TEXT NOT NULL
     )`,
  );
}

/** Cache key string for a rounded lat/lon + fetch month. */
function cacheKey(lat: number, lon: number, month: string): string {
  return `${roundCoord(lat)}_${roundCoord(lon)}_${month}`;
}

/**
 * Reads the most recently fetched SeasonalOutlook for the given coordinates
 * from SQLite, regardless of which calendar month it was fetched in.
 *
 * Searching by the most recent row (rather than current-month exact key)
 * ensures that a valid cached entry from last month is still returned when
 * the device is offline at the start of a new calendar month.
 *
 * Returns null if no cached entry exists.
 */
export async function getCachedOutlook(
  db: SQLiteDatabase,
  lat: number,
  lon: number,
): Promise<SeasonalOutlook | null> {
  try {
    const roundedLat = roundCoord(lat);
    const roundedLon = roundCoord(lon);
    const keyPrefix = `${roundedLat}_${roundedLon}_`;
    const [result] = await db.executeSql(
      `SELECT data
       FROM ${TABLE_NAME}
       WHERE cache_key GLOB ?
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [`${keyPrefix}*`],
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows.item(0) as { data: string };
    return JSON.parse(row.data) as SeasonalOutlook;
  } catch {
    return null;
  }
}

/**
 * Persists a SeasonalOutlook to the SQLite cache.
 */
export async function saveOutlookToCache(
  db: SQLiteDatabase,
  outlook: SeasonalOutlook,
): Promise<void> {
  const key = cacheKey(outlook.lat, outlook.lon, outlook.fetchMonth);
  await db.executeSql(
    `INSERT OR REPLACE INTO ${TABLE_NAME} (cache_key, fetched_at, data)
     VALUES (?, ?, ?)`,
    [key, outlook.fetchedAt, JSON.stringify(outlook)],
  );
}
