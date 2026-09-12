import * as SunCalc from 'suncalc';

/**
 * Shared solar arithmetic.
 *
 * Both the Home solar card and the Sun Times screen answer the same questions
 * from the same fix — "when is sunset", "how much daylight is left", "where is
 * the sun in its arc right now". They computed it separately before, which is
 * how two surfaces end up disagreeing by a minute. This is the one source.
 *
 * Everything here is pure and offline: SunCalc is arithmetic on the device
 * clock and a coordinate, with no network involved.
 */

export type SolarEventName = 'sunrise' | 'sunset' | 'dawn' | 'dusk';

export type SolarSnapshot = {
  sunrise: Date;
  nextSunrise: Date;
  sunset: Date;
  dawn: Date;
  dusk: Date;
  solarNoon: Date;
  /** Start of the evening golden hour. */
  goldenHour: Date;
  /** End of the morning golden hour. */
  goldenHourEnd: Date;
  /** Milliseconds of daylight left, floored at 0 once the sun is down. */
  daylightRemainingMs: number;
  /** The next of sunrise/sunset/dawn/dusk still ahead today, if any. */
  nextEvent: { name: SolarEventName; time: Date; msUntil: number } | null;
  /**
   * The sun's position through its arc, 0 at sunrise and 1 at sunset.
   * Clamped, so it reads 0 before dawn and 1 after dusk rather than running
   * off the end of the figure it drives.
   */
  progress: number;
};

/** True when SunCalc handed back a usable date. */
function isValidDate(value: Date): boolean {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Computes the solar snapshot for a coordinate.
 *
 * Returns `null` for coordinates SunCalc cannot resolve — most often inside
 * the polar circles, where the sun may not rise or set at all on a given day
 * and the library yields Invalid Dates. Callers render their empty state
 * rather than formatting `NaN`.
 */
export function getSolarSnapshot(
  latitude: number,
  longitude: number,
  now: Date = new Date(),
): SolarSnapshot | null {
  if (
    !isFinite(latitude) ||
    !isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const times = SunCalc.getTimes(now, latitude, longitude);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = SunCalc.getTimes(tomorrow, latitude, longitude);
  const required: Date[] = [
    times.sunrise,
    times.sunset,
    times.dawn,
    times.dusk,
    times.solarNoon,
    times.goldenHour,
    times.goldenHourEnd,
    tomorrowTimes.sunrise,
  ];
  if (!required.every(isValidDate)) {
    return null;
  }

  const candidates: { name: SolarEventName; time: Date }[] = [
    { name: 'dawn', time: times.dawn },
    { name: 'sunrise', time: times.sunrise },
    { name: 'sunset', time: times.sunset },
    { name: 'dusk', time: times.dusk },
  ];

  const upcoming = candidates
    .filter((candidate) => candidate.time.getTime() > now.getTime())
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const nextEvent = upcoming.length
    ? {
        name: upcoming[0].name,
        time: upcoming[0].time,
        msUntil: upcoming[0].time.getTime() - now.getTime(),
      }
    : null;

  const dayStart = times.sunrise.getTime();
  const dayEnd = times.sunset.getTime();
  const span = dayEnd - dayStart;

  return {
    sunrise: times.sunrise,
    nextSunrise: tomorrowTimes.sunrise,
    sunset: times.sunset,
    dawn: times.dawn,
    dusk: times.dusk,
    solarNoon: times.solarNoon,
    goldenHour: times.goldenHour,
    goldenHourEnd: times.goldenHourEnd,
    daylightRemainingMs:
      now.getTime() < dayStart
        ? Math.max(0, span)
        : Math.max(0, dayEnd - now.getTime()),
    nextEvent,
    progress:
      span > 0
        ? Math.min(1, Math.max(0, (now.getTime() - dayStart) / span))
        : 0,
  };
}

/**
 * Formats a duration as "2h 08m", or "47m" under an hour.
 *
 * Minutes are zero-padded only alongside hours, where the pair reads as a
 * clock value; a bare "08m" would look like a typo.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Formats elapsed run time as "4m 12s", or "1h 04m" once past an hour. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
