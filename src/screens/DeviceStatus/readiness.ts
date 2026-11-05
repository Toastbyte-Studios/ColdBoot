import { distanceMiles } from '../../utils/distanceMiles';
import { PackRegion } from '../../utils/offlinePacks';

export type ReadinessStatus = 'ready' | 'attention' | 'missing' | 'unknown';

/** Where tapping an item takes the user to fix it. */
export type ReadinessAction =
  | 'offline-maps'
  | 'system-settings'
  | 'backup'
  | 'emergency-plan';

export type ReadinessItem = {
  id: 'location' | 'map' | 'backup' | 'plan';
  title: string;
  status: ReadinessStatus;
  detail: string;
  action: ReadinessAction | null;
};

export type ReadinessInput = {
  fix: { latitude: number; longitude: number } | null;
  locationDenied: boolean;
  mapsLoaded: boolean;
  packs: { name: string; region: PackRegion | null }[];
  lastBackupAt: number | null;
  plan: { contacts: number; rallyPoints: number; hasCommsPlan: boolean };
  now?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** A backup older than this is flagged: a month of notes and logs is a lot to lose. */
export const BACKUP_STALE_DAYS = 30;

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

function locationItem(input: ReadinessInput): ReadinessItem {
  // Always opens system settings: that is where the permission is changed,
  // and where it can be reviewed when it is already allowed.
  const base = {
    id: 'location' as const,
    title: 'Location access',
    action: 'system-settings' as const,
  };
  if (input.locationDenied) {
    return {
      ...base,
      status: 'missing',
      detail: 'Turned off. GPS tools need it',
    };
  }
  if (input.fix) {
    return { ...base, status: 'ready', detail: 'Allowed' };
  }
  return { ...base, status: 'unknown', detail: 'Waiting for a first fix' };
}

/**
 * Whether a downloaded area covers where the device is. Coverage is the
 * circle the area was downloaded with (centre and radius), which is what the
 * Map draws for it.
 */
function mapItem(input: ReadinessInput): ReadinessItem {
  const base = {
    id: 'map' as const,
    title: 'Offline map here',
    action: 'offline-maps' as const,
  };
  if (!input.mapsLoaded) {
    return { ...base, status: 'unknown', detail: 'Checking…' };
  }
  if (input.packs.length === 0) {
    return { ...base, status: 'missing', detail: 'No areas downloaded' };
  }
  if (!input.fix) {
    return {
      ...base,
      status: 'unknown',
      detail: `${plural(input.packs.length, 'area')} saved; needs a GPS fix to check`,
    };
  }
  const { latitude, longitude } = input.fix;
  const covering = input.packs.find(
    (pack) =>
      pack.region &&
      distanceMiles(
        latitude,
        longitude,
        pack.region.center.latitude,
        pack.region.center.longitude,
      ) <= pack.region.radiusMiles,
  );
  if (covering) {
    return { ...base, status: 'ready', detail: `Covered by ${covering.name}` };
  }
  return {
    ...base,
    status: 'attention',
    detail: `You're outside your ${plural(input.packs.length, 'saved area')}`,
  };
}

function backupItem(input: ReadinessInput): ReadinessItem {
  const base = {
    id: 'backup' as const,
    title: 'Backup',
    action: 'backup' as const,
  };
  if (input.lastBackupAt == null) {
    return { ...base, status: 'missing', detail: 'Never backed up' };
  }
  const days = Math.floor(
    ((input.now ?? Date.now()) - input.lastBackupAt) / DAY_MS,
  );
  const when =
    days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return {
    ...base,
    status: days > BACKUP_STALE_DAYS ? 'attention' : 'ready',
    detail: `Last backed up ${when}`,
  };
}

/** The emergency plan's three parts: contacts, a rally point, a comms plan. */
function planItem(input: ReadinessInput): ReadinessItem {
  const base = {
    id: 'plan' as const,
    title: 'Emergency plan',
    action: 'emergency-plan' as const,
  };
  const missing = [
    input.plan.contacts === 0 && 'contacts',
    input.plan.rallyPoints === 0 && 'rally point',
    !input.plan.hasCommsPlan && 'comms plan',
  ].filter((part): part is string => !!part);

  if (missing.length === 0) {
    return {
      ...base,
      status: 'ready',
      detail: 'Contacts, rally point, comms plan',
    };
  }
  if (missing.length === 3) {
    return { ...base, status: 'missing', detail: 'Not started' };
  }
  return {
    ...base,
    status: 'attention',
    detail: `Missing ${missing.join(', ')}`,
  };
}

/**
 * The off-grid readiness checklist: the things worth sorting out while there
 * is still signal and power, each with where to go to fix it.
 */
export function readinessItems(input: ReadinessInput): ReadinessItem[] {
  return [
    locationItem(input),
    mapItem(input),
    backupItem(input),
    planItem(input),
  ];
}
