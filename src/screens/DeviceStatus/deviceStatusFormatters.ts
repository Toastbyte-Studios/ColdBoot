import { MeasurementSystem } from '../../stores/SettingsStore';

/**
 * Pure formatting for the Device Status screen. Kept out of the components so
 * each rule (what counts as a good fix, how a connection is described) can be
 * tested on its own.
 */

/** How much a reading can be relied on, which drives the row's status dot. */
export type StatusTone = 'good' | 'fair' | 'poor' | 'neutral';

const METERS_PER_FOOT = 0.3048;

/** "34.05220° N, 118.24370° W" */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(5)}° ${
    longitude >= 0 ? 'E' : 'W'
  }`;
  return `${lat}, ${lng}`;
}

/** A length in metres, shown in the user's units: "±8 m" / "±26 ft". */
export function formatMeters(
  meters: number,
  system: MeasurementSystem,
): string {
  if (system === 'imperial') {
    return `${Math.round(meters / METERS_PER_FOOT).toLocaleString()} ft`;
  }
  return `${Math.round(meters).toLocaleString()} m`;
}

/**
 * Horizontal accuracy as a quality band. The thresholds follow what the fix is
 * good for on foot: within 10 m you can find a trail junction, within 50 m you
 * are on the right hillside, beyond that treat the position as a rough guide.
 */
export function accuracyTone(accuracyMeters: number | null | undefined): {
  tone: StatusTone;
  label: string;
} {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) {
    return { tone: 'neutral', label: 'Unknown' };
  }
  if (accuracyMeters <= 10) return { tone: 'good', label: 'Good' };
  if (accuracyMeters <= 50) return { tone: 'fair', label: 'Fair' };
  return { tone: 'poor', label: 'Poor' };
}

/**
 * How long ago a fix was taken: "Just now", "4 min ago", "2 hr ago",
 * "3 days ago". The age matters as much as the coordinates: a fix from this
 * morning says where you were, not where you are.
 */
export function formatAge(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * A fix older than this no longer describes where the device is. The store
 * polls GPS every minute while the app is open, so anything past a few polls
 * means the device has stopped getting fixes.
 */
export const STALE_FIX_MS = 5 * 60 * 1000;

export function fixAgeTone(timestamp: number, now: number = Date.now()) {
  return now - timestamp > STALE_FIX_MS ? 'poor' : 'good';
}
