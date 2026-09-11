import * as apsis from 'astronomia/apsis';
import vsopEarth from 'astronomia/data/vsop87Bearth';
import vsopJupiter from 'astronomia/data/vsop87Bjupiter';
import vsopMars from 'astronomia/data/vsop87Bmars';
import vsopSaturn from 'astronomia/data/vsop87Bsaturn';
import vsopVenus from 'astronomia/data/vsop87Bvenus';
import * as eclipseModule from 'astronomia/eclipse';
import { position as ellipticPosition } from 'astronomia/elliptic';
import { Coord as GlobeCoord } from 'astronomia/globe';
import * as julian from 'astronomia/julian';
import { Planet } from 'astronomia/planetposition';
import { approxTimes, Stdh0Stellar } from 'astronomia/rise';
import { mean as siderealMean } from 'astronomia/sidereal';
import * as solsticeModule from 'astronomia/solstice';
import { makeAutoObservable, runInAction } from 'mobx';
import * as SunCalc from 'suncalc';

export type AstronomyEventType =
  | 'solar_eclipse'
  | 'lunar_eclipse'
  | 'solstice'
  | 'equinox'
  | 'supermoon'
  | 'planet_rise';

export interface AstronomyEvent {
  id: string;
  type: AstronomyEventType;
  date: Date;
  label: string;
  detail: string;
  /**
   * Ionicons outline glyph name. Not an emoji: these render in SkyEvents, the
   * footer ticker and the notifications list, and emoji differ per platform
   * and are announced by name. See docs/NATIVE_REDESIGN.md finding 7.
   */
  icon: string;
  visibleFromLocation?: boolean;
}

// Significant location change threshold for astronomy recalculation
// 0.5 degrees (~55 km) is sufficient for astronomical event visibility
const LOCATION_CHANGE_THRESHOLD_DEGREES = 0.5;

// Days to look ahead for planet rise events
const PLANET_RISE_LOOKAHEAD_DAYS = 14;

// Moon phase tolerance for supermoon detection (full moon phase is 0.5)
const SUPERMOON_PHASE_TOLERANCE = 0.07;

// Eclipse type names mapped from the astronomia TYPE constants
const SOLAR_ECLIPSE_LABELS: Record<number, string> = {
  [eclipseModule.TYPE.Partial]: 'Partial Solar Eclipse',
  [eclipseModule.TYPE.Annular]: 'Annular Solar Eclipse',
  [eclipseModule.TYPE.AnnularTotal]: 'Annular-Total Solar Eclipse',
  [eclipseModule.TYPE.Total]: 'Total Solar Eclipse',
};

const LUNAR_ECLIPSE_LABELS: Record<number, string> = {
  [eclipseModule.TYPE.Penumbral]: 'Penumbral Lunar Eclipse',
  [eclipseModule.TYPE.Umbral]: 'Partial Umbral Lunar Eclipse',
  [eclipseModule.TYPE.Total]: 'Total Lunar Eclipse',
};

const PLANET_DATA = [
  { name: 'Venus', vsop: vsopVenus },
  { name: 'Mars', vsop: vsopMars },
  { name: 'Jupiter', vsop: vsopJupiter },
  { name: 'Saturn', vsop: vsopSaturn },
] as const;

/**
 * Converts a Date to a decimal year (e.g. 2026.25 = end of March 2026).
 */
function dateToDecimalYear(date: Date): number {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return year + (date.getTime() - start) / (end - start);
}

/**
 * Formats a time given as seconds since midnight UTC as a local time string.
 * The offset is applied from UTC midnight of `baseDate`'s calendar date,
 * then rendered in the device's local timezone.
 */
function formatRiseTime(
  secondsFromMidnightUtc: number,
  baseDate: Date,
): string {
  const utcMidnightMs = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  const d = new Date(utcMidnightMs + secondsFromMidnightUtc * 1000);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * AstronomyEventStore computes and caches upcoming astronomical events:
 * - Solar and lunar eclipses
 * - Solstices and equinoxes
 * - Supermoons (perigee coinciding with full moon)
 * - Planet rise times (Venus, Mars, Jupiter, Saturn)
 *
 * All calculations are performed offline using the `astronomia` library.
 * Results are cached in memory and recomputed only on significant location
 * change (>0.5°) or calendar date rollover.
 */
export class AstronomyEventStore {
  private _events: AstronomyEvent[] = [];
  private _lastComputeDate: Date | null = null;
  private _lastComputeLocation: { lat: number; lon: number } | null = null;
  private _earthPlanet: Planet | null = null;

  constructor() {
    makeAutoObservable(this, { _earthPlanet: false } as never, {
      autoBind: true,
    });
    try {
      this._earthPlanet = new Planet(vsopEarth);
    } catch (e) {
      console.warn(
        'AstronomyEventStore: failed to initialize Earth VSOP87 data; planet rise events will be unavailable.',
        e,
      );
    }
  }

  /**
   * Returns all cached upcoming astronomy events sorted by date.
   * Call `computeEvents` first to populate the cache.
   */
  get events(): AstronomyEvent[] {
    return this._events;
  }

  /**
   * Returns the next astronomy event occurring within the specified number of
   * days from now, or null if none.
   *
   * @param withinDays - look-ahead window in days (default 30)
   */
  getNextAstronomyEvent(withinDays: number = 30): AstronomyEvent | null {
    const now = new Date();
    const deadline = now.getTime() + withinDays * 24 * 3600 * 1000;
    return (
      this._events.find((e) => e.date > now && e.date.getTime() <= deadline) ??
      null
    );
  }

  /**
   * Returns all upcoming astronomy events within the given number of months.
   *
   * @param months - number of months ahead to include (default 12)
   */
  getUpcomingEvents(months: number = 12): AstronomyEvent[] {
    const now = new Date();
    const deadline = new Date(
      now.getFullYear(),
      now.getMonth() + months,
      now.getDate(),
    );
    return this._events.filter((e) => e.date > now && e.date <= deadline);
  }

  /**
   * Computes (or re-uses cached) astronomy events for the given observer location.
   * Recomputes only when the location changes by more than the threshold or
   * when the calendar date has rolled over.
   *
   * @param latitude - observer latitude in degrees (-90 to 90)
   * @param longitude - observer longitude in degrees (-180 to 180)
   */
  computeEvents(latitude: number, longitude: number): void {
    if (!this._needsRecompute(latitude, longitude)) {
      return;
    }

    const now = new Date();
    const solsticeEquinoxEvents = this._computeSolsticesEquinoxes();
    const eclipseEvents = this._computeEclipses();
    const supermoonEvents = this._computeSupermoons();
    const planetRiseEvents = this._computePlanetRise(latitude, longitude);

    const allEvents = [
      ...solsticeEquinoxEvents,
      ...eclipseEvents,
      ...supermoonEvents,
      ...planetRiseEvents,
    ]
      .filter((e) => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    runInAction(() => {
      this._events = allEvents;
      this._lastComputeDate = new Date();
      this._lastComputeLocation = { lat: latitude, lon: longitude };
    });
  }

  /**
   * Computes astronomy events without a known observer location.
   * Planet rise times are omitted since they require lat/lon.
   * All other events (solstices, equinoxes, eclipses, supermoons) are included.
   */
  computeEventsWithoutLocation(): void {
    const now = new Date();
    // Use a sentinel location that won't match any real cached location
    const SENTINEL_LAT = 1000;
    const SENTINEL_LON = 1000;

    if (
      this._lastComputeLocation?.lat === SENTINEL_LAT &&
      this._lastComputeLocation?.lon === SENTINEL_LON &&
      this._lastComputeDate?.toDateString() === now.toDateString()
    ) {
      return; // already computed for no-location today
    }

    const allEvents = [
      ...this._computeSolsticesEquinoxes(),
      ...this._computeEclipses(),
      ...this._computeSupermoons(),
    ]
      .filter((e) => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    runInAction(() => {
      this._events = allEvents;
      this._lastComputeDate = new Date();
      this._lastComputeLocation = { lat: SENTINEL_LAT, lon: SENTINEL_LON };
    });
  }

  private _needsRecompute(lat: number, lon: number): boolean {
    if (!this._lastComputeDate || !this._lastComputeLocation) {
      return true;
    }
    // Recompute if the calendar date has changed
    if (this._lastComputeDate.toDateString() !== new Date().toDateString()) {
      return true;
    }
    // Recompute if location changed significantly
    if (
      Math.abs(this._lastComputeLocation.lat - lat) >
        LOCATION_CHANGE_THRESHOLD_DEGREES ||
      Math.abs(this._lastComputeLocation.lon - lon) >
        LOCATION_CHANGE_THRESHOLD_DEGREES
    ) {
      return true;
    }
    return false;
  }

  // ── Solstices & Equinoxes ──────────────────────────────────────────────────

  private _computeSolsticesEquinoxes(): AstronomyEvent[] {
    const events: AstronomyEvent[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    const seasonDefs: Array<{
      fn: (y: number) => number;
      key: string;
      type: AstronomyEventType;
      label: string;
      icon: string;
      detail: string;
    }> = [
      {
        fn: solsticeModule.march,
        key: 'march',
        type: 'equinox',
        label: 'Spring Equinox',
        icon: 'flower-outline',
        detail:
          'Day and night are equal; spring begins in the Northern Hemisphere',
      },
      {
        fn: solsticeModule.june,
        key: 'june',
        type: 'solstice',
        label: 'Summer Solstice',
        icon: 'sunny-outline',
        detail: 'Longest day of the year in the Northern Hemisphere',
      },
      {
        fn: solsticeModule.september,
        key: 'september',
        type: 'equinox',
        label: 'Autumn Equinox',
        icon: 'leaf-outline',
        detail:
          'Day and night are equal; autumn begins in the Northern Hemisphere',
      },
      {
        fn: solsticeModule.december,
        key: 'december',
        type: 'solstice',
        label: 'Winter Solstice',
        icon: 'snow-outline',
        detail: 'Shortest day of the year in the Northern Hemisphere',
      },
    ];

    // Check the current year and next year to ensure 12 months of coverage
    for (const year of [currentYear, currentYear + 1]) {
      for (const def of seasonDefs) {
        try {
          const jde = def.fn(year);
          const date = julian.JDEToDate(jde);
          if (date > now) {
            events.push({
              id: `${def.key}-${year}`,
              type: def.type,
              date,
              label: def.label,
              detail: def.detail,
              icon: def.icon,
            });
          }
        } catch {
          // Skip this event if calculation fails
        }
      }
    }

    return events;
  }

  // ── Eclipses ───────────────────────────────────────────────────────────────

  private _computeEclipses(): AstronomyEvent[] {
    const events: AstronomyEvent[] = [];
    const now = new Date();
    const nowDecimalYear = dateToDecimalYear(now);
    const endDecimalYear = nowDecimalYear + 1.0;
    const seenJdes = new Set<string>();

    // Step through roughly one new/full moon interval at a time (~29.5 days ≈ 0.08 years)
    for (let y = nowDecimalYear; y <= endDecimalYear; y += 0.07) {
      // Solar eclipse
      try {
        const sol = eclipseModule.solar(y);
        if (sol.type !== eclipseModule.TYPE.None && sol.jdeMax) {
          const jdeKey = `solar-${Math.round(sol.jdeMax)}`;
          if (!seenJdes.has(jdeKey)) {
            seenJdes.add(jdeKey);
            const date = julian.JDEToDate(sol.jdeMax);
            if (date > now) {
              const label = SOLAR_ECLIPSE_LABELS[sol.type] ?? 'Solar Eclipse';
              events.push({
                id: jdeKey,
                type: 'solar_eclipse',
                date,
                label,
                detail: sol.central
                  ? 'Central eclipse — path of totality crosses Earth'
                  : 'Eclipse visible from parts of Earth',
                icon: 'contrast-outline',
              });
            }
          }
        }
      } catch {
        // Skip if calculation fails
      }

      // Lunar eclipse
      try {
        const lun = eclipseModule.lunar(y);
        if (lun.type !== eclipseModule.TYPE.None && lun.jdeMax) {
          const jdeKey = `lunar-${Math.round(lun.jdeMax)}`;
          if (!seenJdes.has(jdeKey)) {
            seenJdes.add(jdeKey);
            const date = julian.JDEToDate(lun.jdeMax);
            if (date > now) {
              const label = LUNAR_ECLIPSE_LABELS[lun.type] ?? 'Lunar Eclipse';
              events.push({
                id: jdeKey,
                type: 'lunar_eclipse',
                date,
                label,
                detail: `Eclipse magnitude: ${lun.magnitude?.toFixed(2) ?? 'N/A'}`,
                icon: 'contrast-outline',
              });
            }
          }
        }
      } catch {
        // Skip if calculation fails
      }
    }

    return events;
  }

  // ── Supermoons ─────────────────────────────────────────────────────────────

  private _computeSupermoons(): AstronomyEvent[] {
    const events: AstronomyEvent[] = [];
    const now = new Date();
    const nowDecimalYear = dateToDecimalYear(now);
    const seenJdes = new Set<string>();

    // Iterate through ~14 lunar months (perigee period ≈ 27.55 days ≈ 0.075 years)
    for (let y = nowDecimalYear; y <= nowDecimalYear + 1.0; y += 0.07) {
      try {
        const jde = apsis.perigee(y);
        const jdeKey = `perigee-${Math.round(jde)}`;
        if (seenJdes.has(jdeKey)) {
          continue;
        }
        seenJdes.add(jdeKey);

        const date = julian.JDEToDate(jde);
        if (date <= now) {
          continue;
        }

        // A supermoon occurs when perigee coincides with a full moon (phase ≈ 0.5)
        const moonIllum = SunCalc.getMoonIllumination(date);
        if (Math.abs(moonIllum.phase - 0.5) < SUPERMOON_PHASE_TOLERANCE) {
          events.push({
            id: jdeKey,
            type: 'supermoon',
            date,
            label: 'Supermoon',
            detail: `Full moon at closest approach — ${Math.round(moonIllum.fraction * 100)}% illuminated`,
            icon: 'moon-outline',
          });
        }
      } catch {
        // Skip if calculation fails
      }
    }

    return events;
  }

  // ── Planet Rise Times ──────────────────────────────────────────────────────

  private _computePlanetRise(
    latitude: number,
    longitude: number,
  ): AstronomyEvent[] {
    if (!this._earthPlanet) {
      return [];
    }

    const events: AstronomyEvent[] = [];
    const now = new Date();
    // Observer coordinates in radians
    const latRad = (latitude * Math.PI) / 180;
    const lonRad = (longitude * Math.PI) / 180;
    const observerCoord = new GlobeCoord(latRad, lonRad);

    for (const planet of PLANET_DATA) {
      let planetObj: Planet | null = null;
      try {
        planetObj = new Planet(planet.vsop);
      } catch {
        continue;
      }

      // Look forward up to PLANET_RISE_LOOKAHEAD_DAYS days to find the next
      // night when this planet rises before midnight local time
      for (
        let dayOffset = 0;
        dayOffset < PLANET_RISE_LOOKAHEAD_DAYS;
        dayOffset++
      ) {
        const targetDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + dayOffset,
        );

        try {
          const riseTime = this._getPlanetRiseTime(
            planetObj,
            targetDate,
            observerCoord,
            latitude,
            longitude,
          );
          if (riseTime !== null) {
            // Check if rise is during dark hours (between 6 PM and 6 AM local).
            // Use UTC midnight as the consistent base (matching formatRiseTime).
            const utcMidnightMs = Date.UTC(
              targetDate.getUTCFullYear(),
              targetDate.getUTCMonth(),
              targetDate.getUTCDate(),
            );
            const riseDate = new Date(utcMidnightMs + riseTime * 1000);
            const riseLocalHour =
              riseDate.getHours() + riseDate.getMinutes() / 60;
            if (riseLocalHour >= 18 || riseLocalHour < 6) {
              const timeStr = formatRiseTime(riseTime, targetDate);
              const isTonight =
                targetDate.toDateString() === now.toDateString();
              events.push({
                id: `planet-rise-${planet.name}-${targetDate.toISOString().slice(0, 10)}`,
                type: 'planet_rise',
                date: new Date(utcMidnightMs + riseTime * 1000),
                label: `${planet.name} rises at ${timeStr}`,
                detail: isTonight
                  ? `${planet.name} rises tonight at ${timeStr}`
                  : `${planet.name} rises on ${targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`,
                icon: 'planet-outline',
              });
              break; // Found the next favorable night for this planet
            }
          }
        } catch {
          // Skip this day if calculation fails
        }
      }
    }

    return events;
  }

  /**
   * Computes the approximate rise time for a planet on a given date.
   * Returns seconds from midnight UTC, or null if the planet does not rise
   * on that date or if an error occurs.
   */
  private _getPlanetRiseTime(
    planet: Planet,
    date: Date,
    observerCoord: GlobeCoord,
    latitude: number,
    longitude: number,
  ): number | null {
    try {
      const jde = julian.DateToJDE(date);
      const { ra, dec } = ellipticPosition(planet, this._earthPlanet!, jde);

      // Compute Greenwich Mean Sidereal Time at 0h UT
      const jd0 = julian.CalendarGregorianToJD(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      );
      const Th0 = siderealMean(jd0);

      const result = approxTimes(observerCoord, Stdh0Stellar, Th0, ra, dec);
      if (result && typeof result.rise === 'number' && isFinite(result.rise)) {
        // result.rise is seconds from midnight UT; adjust for longitude offset
        // (approxTimes returns times relative to the observer's meridian)
        const lonOffsetSecs = (longitude / 360) * 86400;
        return result.rise - lonOffsetSecs;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clears cached events and resets computation state.
   */
  dispose(): void {
    runInAction(() => {
      this._events = [];
      this._lastComputeDate = null;
      this._lastComputeLocation = null;
    });
  }
}
