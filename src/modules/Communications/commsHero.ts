import { distanceMiles } from '../../utils/distanceMiles';
import { formatDistance } from '../Navigation/navigationHero';
import type { MeasurementSystem } from '../../stores/SettingsStore';

type Channel = { name: string; frequency: string; notes?: string };
type Service = {
  id: string;
  title: string;
  requiresLicense: boolean;
  channels: Channel[];
};

/**
 * The channel to try first in an emergency, from the radio reference data:
 * a licence-free channel whose notes reserve it for emergencies (CB 9, by
 * FCC rule), so anyone holding a radio may use it. Falls back to any
 * emergency channel, then null.
 */
export function emergencyChannel(
  services: readonly Service[],
): { service: Service; channel: Channel } | null {
  const isEmergency = (channel: Channel) =>
    /emergenc/i.test(channel.notes ?? '');
  const ordered = [
    ...services.filter((s) => !s.requiresLicense),
    ...services.filter((s) => s.requiresLicense),
  ];
  for (const service of ordered) {
    const channel = service.channels.find(isEmergency);
    if (channel) return { service, channel };
  }
  return null;
}

/** "CB · Channel 9 · 27.065 MHz" */
export function channelText(service: { id: string }, channel: Channel): string {
  return `${service.id} ${channel.name.replace(/^Channel\s+/i, 'ch ')} · ${channel.frequency}`;
}

type RepeaterLike = {
  callSign: string;
  frequency: string;
  lat: number;
  lng: number;
  distance: number;
  operationalStatus: string;
  isCustom?: boolean;
};

/**
 * The closest geocoded repeater, preferring ones listed as on the air.
 * Distance is measured from the current fix when there is one; otherwise
 * the cached distance from where the list was fetched.
 */
export function nearestRepeater<T extends RepeaterLike>(
  repeaters: readonly T[],
  from: { latitude: number; longitude: number } | null,
): { repeater: T; miles: number } | null {
  const located = repeaters.filter(
    (r) => !(r.isCustom && r.lat === 0 && r.lng === 0),
  );
  const pool = located.some((r) => r.operationalStatus === 'On-air')
    ? located.filter((r) => r.operationalStatus === 'On-air')
    : located;
  let best: { repeater: T; miles: number } | null = null;
  for (const repeater of pool) {
    const miles =
      from && Number.isFinite(repeater.lat) && Number.isFinite(repeater.lng)
        ? distanceMiles(
            from.latitude,
            from.longitude,
            repeater.lat,
            repeater.lng,
          )
        : repeater.distance;
    if (!Number.isFinite(miles)) continue;
    if (!best || miles < best.miles) best = { repeater, miles };
  }
  return best;
}

/** "W6ABC · 146.940 · 3.2 mi" */
export function repeaterText(
  nearest: { repeater: RepeaterLike; miles: number },
  system: MeasurementSystem,
): string {
  const frequency = nearest.repeater.frequency.replace(/\s*MHz$/i, '');
  return `${nearest.repeater.callSign} · ${frequency} · ${formatDistance(nearest.miles, system)}`;
}
