import {
  accuracyTone,
  fixAgeTone,
  formatAge,
  formatMeters,
} from '../../screens/DeviceStatus/deviceStatusFormatters';
import { distanceMiles } from '../../utils/distanceMiles';
import { ddToMgrs } from '../../utils/gridReference';
import type { HeroTone } from '../../components/ModuleHero';
import type { MeasurementSystem } from '../../stores/SettingsStore';

type Point = { latitude: number; longitude: number };

export type PositionHeadline = {
  headline: string;
  detail: string;
  tone?: HeroTone;
};

/**
 * Where the device is, as an MGRS grid reference: the form you'd read out
 * over a radio. The detail says how far to trust it (accuracy band and age).
 * Outside MGRS's latitude range (near the poles) it falls back to degrees.
 */
export function positionHeadline(
  fix: {
    coords: Point & { accuracy?: number | null };
    timestamp: number;
  } | null,
  locationDenied: boolean,
  system: MeasurementSystem,
  now: number = Date.now(),
  pollIntervalMs?: number,
): PositionHeadline {
  if (!fix) {
    return locationDenied
      ? {
          headline: 'Location off',
          detail: 'Allow location access in Settings to see your position.',
          tone: 'poor',
        }
      : {
          headline: 'Waiting for GPS…',
          detail: 'Your grid reference appears with the first fix.',
          tone: 'muted',
        };
  }
  const { latitude, longitude, accuracy } = fix.coords;
  let headline: string;
  try {
    headline = ddToMgrs(latitude, longitude);
  } catch {
    headline = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
  const quality = accuracyTone(accuracy);
  const stale = fixAgeTone(fix.timestamp, now, pollIntervalMs) === 'poor';
  const accuracyText =
    accuracy != null && Number.isFinite(accuracy)
      ? `±${formatMeters(accuracy, system)} · ${quality.label}`
      : 'Accuracy unknown';
  return {
    headline,
    detail: `${accuracyText} · ${formatAge(fix.timestamp, now).toLowerCase()}`,
    tone: stale || quality.tone === 'poor' ? 'fair' : undefined,
  };
}

/**
 * Coordinates typed into a rally point's free-text location, or null.
 * Deliberately strict ("34.05, -118.24" or "34.05° N, 118.24° W"): the field
 * also holds street addresses, and "12 Oak St 4" must not become a point.
 */
export function parseCoordinateText(text: string | undefined): Point | null {
  if (!text) return null;
  const match = text
    .trim()
    .match(
      /^(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EWew])?$/,
    );
  if (!match) return null;
  let latitude = parseFloat(match[1]);
  let longitude = parseFloat(match[3]);
  if (match[2] && /s/i.test(match[2])) latitude = -Math.abs(latitude);
  if (match[4] && /w/i.test(match[4])) longitude = -Math.abs(longitude);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Initial great-circle bearing from `a` to `b`, 0–360° clockwise from north. */
export function bearingDegrees(a: Point, b: Point): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The nearest of the eight compass points. */
export function compassPoint(degrees: number): string {
  return POINTS[Math.round(degrees / 45) % 8];
}

/** "1.2 mi", "450 ft", "3.4 km", "800 m". */
export function formatDistance(miles: number, system: MeasurementSystem) {
  if (system === 'imperial') {
    return miles < 0.1
      ? `${Math.round(miles * 5280)} ft`
      : `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }
  const km = miles * 1.609344;
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export type SafePoint = {
  name: string;
  kind: 'Rally point' | 'Waypoint';
} & Point;

/**
 * The closest rally point (with coordinates) or map waypoint, as
 * "Creek bridge · 1.2 mi NE". Null with nothing to measure to.
 */
export function nearestSafePoint(
  from: Point | null,
  points: readonly SafePoint[],
  system: MeasurementSystem,
): { label: string; value: string } | null {
  if (!from || points.length === 0) return null;
  let best: { point: SafePoint; miles: number } | null = null;
  for (const point of points) {
    const miles = distanceMiles(
      from.latitude,
      from.longitude,
      point.latitude,
      point.longitude,
    );
    if (!best || miles < best.miles) best = { point, miles };
  }
  if (!best) return null;
  const direction = compassPoint(bearingDegrees(from, best.point));
  return {
    label: best.point.kind,
    value: `${best.point.name} · ${formatDistance(best.miles, system)} ${direction}`,
  };
}

/** The most recent saved track: "2.4 mi · Nov 5". */
export function lastTrackText(
  tracks: readonly { createdAt: string; distanceMeters: number }[],
  system: MeasurementSystem,
): string | null {
  if (tracks.length === 0) return null;
  const latest = [...tracks].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];
  const date = new Date(latest.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `${formatDistance(latest.distanceMeters / 1609.344, system)} · ${date}`;
}
