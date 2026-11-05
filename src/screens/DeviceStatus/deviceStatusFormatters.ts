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

/**
 * Battery level as a band. Under 20% is where phones start throttling and
 * where a day out turns into rationing; under 50% is worth knowing about
 * before heading somewhere with no way to charge.
 */
export function batteryTone(
  level: number | null,
  charging: boolean | null,
): StatusTone {
  if (level == null) return 'neutral';
  if (charging) return 'good';
  if (level < 0.2) return 'poor';
  if (level < 0.5) return 'fair';
  return 'good';
}

/** "5 hr 10 min", "45 min", "2 hr". */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

/**
 * The battery estimate for its row: time left on battery, or time to full when
 * charging. The store's figure is a rough baseline until a few samples have
 * shown the real drain rate, hence "About".
 */
export function batteryEstimate(
  minutes: number | null,
  charging: boolean | null,
  level: number | null,
): { label: string; value: string } {
  if (charging) {
    if (level != null && level >= 0.99)
      return { label: 'Charging', value: 'Full' };
    return {
      label: 'Time to full',
      value:
        minutes == null ? 'Calculating…' : `About ${formatMinutes(minutes)}`,
    };
  }
  return {
    label: 'Time left',
    value: minutes == null ? 'Calculating…' : `About ${formatMinutes(minutes)}`,
  };
}

/**
 * The parts of NetInfo's state the Connectivity section reads. Structural, so
 * the formatter can be tested with plain objects.
 */
export type NetSnapshot = {
  type: string;
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
  details?: {
    cellularGeneration?: string | null;
    carrier?: string | null;
    strength?: number | null;
    isConnectionExpensive?: boolean;
  } | null;
};

const CONNECTION_NAMES: Record<string, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Cellular',
  ethernet: 'Ethernet',
  bluetooth: 'Bluetooth',
  vpn: 'VPN',
  wimax: 'WiMAX',
  other: 'Other',
};

export type ConnectionSummary = {
  status: string;
  tone: StatusTone;
  /** "Wi-Fi", "Cellular · 5G", "None". */
  connection: string;
  carrier: string | null;
  /** Wi-Fi signal 0–100; Android only, null elsewhere. */
  signal: number | null;
  metered: boolean;
};

/**
 * What the device is connected to. "Connected, no internet" is its own state:
 * a phone on a trailhead's captive Wi-Fi, or with one bar of signal, says
 * Connected but cannot reach anything, which is the case worth spelling out.
 */
export function connectionSummary(net: NetSnapshot | null): ConnectionSummary {
  if (!net || net.isConnected == null) {
    return {
      status: 'Checking…',
      tone: 'neutral',
      connection: 'Unknown',
      carrier: null,
      signal: null,
      metered: false,
    };
  }

  const details = net.details ?? null;
  const isOnline = net.isConnected === true;
  const noInternet = isOnline && net.isInternetReachable === false;

  let connection = 'None';
  if (isOnline) {
    connection = CONNECTION_NAMES[net.type] ?? 'Unknown';
    const generation = details?.cellularGeneration;
    if (net.type === 'cellular' && generation) {
      connection += ` · ${generation.toUpperCase()}`;
    }
  }

  return {
    status: !isOnline
      ? 'Offline'
      : noInternet
        ? 'Connected, no internet'
        : 'Online',
    tone: !isOnline ? 'poor' : noInternet ? 'fair' : 'good',
    connection,
    carrier:
      isOnline && net.type === 'cellular' && details?.carrier
        ? details.carrier
        : null,
    signal:
      isOnline && net.type === 'wifi' && typeof details?.strength === 'number'
        ? Math.max(0, Math.min(100, Math.round(details.strength)))
        : null,
    metered: isOnline && details?.isConnectionExpensive === true,
  };
}
