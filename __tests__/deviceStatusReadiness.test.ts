import {
  BACKUP_STALE_DAYS,
  ReadinessInput,
  readinessItems,
} from '../src/screens/DeviceStatus/readiness';

const NOW = Date.UTC(2026, 10, 5, 18);
const DAY = 24 * 60 * 60 * 1000;
const LA = { latitude: 34.0522, longitude: -118.2437 };
const SF = { latitude: 37.7749, longitude: -122.4194 };

const ready: ReadinessInput = {
  fix: LA,
  locationDenied: false,
  mapsLoaded: true,
  packs: [{ name: 'Los Angeles', region: { center: LA, radiusMiles: 10 } }],
  lastBackupAt: NOW - 3 * DAY,
  plan: { contacts: 2, rallyPoints: 1, hasCommsPlan: true },
  now: NOW,
};

const item = (input: Partial<ReadinessInput>, id: string) => {
  const found = readinessItems({ ...ready, ...input }).find(
    (entry) => entry.id === id,
  );
  if (!found) throw new Error(`no ${id} item`);
  return found;
};

describe('readinessItems', () => {
  it('is all ready when everything is in place', () => {
    const items = readinessItems(ready);
    expect(items.map((entry) => entry.status)).toEqual([
      'ready',
      'ready',
      'ready',
      'ready',
    ]);
    expect(items[1].detail).toBe('Covered by Los Angeles');
  });

  describe('location', () => {
    it('sends a denied permission to system settings', () => {
      expect(item({ locationDenied: true, fix: null }, 'location')).toEqual({
        id: 'location',
        title: 'Location access',
        status: 'missing',
        detail: 'Turned off. GPS tools need it',
        action: 'system-settings',
      });
    });

    it('waits, rather than failing, before the first fix', () => {
      expect(item({ fix: null }, 'location').status).toBe('unknown');
    });
  });

  describe('offline map', () => {
    it('flags a location outside every saved area', () => {
      expect(item({ fix: SF }, 'map')).toMatchObject({
        status: 'attention',
        detail: "You're outside your 1 saved area",
        action: 'offline-maps',
      });
    });

    it('is missing with no areas downloaded', () => {
      expect(item({ packs: [] }, 'map')).toMatchObject({
        status: 'missing',
        detail: 'No areas downloaded',
      });
    });

    it("can't judge coverage without a fix", () => {
      expect(item({ fix: null }, 'map').status).toBe('unknown');
    });

    it('ignores an area whose region cannot be placed', () => {
      expect(
        item({ packs: [{ name: 'Broken', region: null }] }, 'map').status,
      ).toBe('attention');
    });

    it('waits for the map library to load', () => {
      expect(item({ mapsLoaded: false }, 'map').detail).toBe('Checking…');
    });
  });

  describe('backup', () => {
    it('is missing when never backed up', () => {
      expect(item({ lastBackupAt: null }, 'backup')).toMatchObject({
        status: 'missing',
        detail: 'Never backed up',
        action: 'backup',
      });
    });

    it(`flags a backup older than ${BACKUP_STALE_DAYS} days`, () => {
      expect(item({ lastBackupAt: NOW - 45 * DAY }, 'backup')).toMatchObject({
        status: 'attention',
        detail: 'Last backed up 45 days ago',
      });
    });

    it('reads today and yesterday naturally', () => {
      expect(item({ lastBackupAt: NOW - 60_000 }, 'backup').detail).toBe(
        'Last backed up today',
      );
      expect(item({ lastBackupAt: NOW - DAY }, 'backup').detail).toBe(
        'Last backed up yesterday',
      );
    });
  });

  describe('emergency plan', () => {
    it('lists the missing parts', () => {
      expect(
        item(
          { plan: { contacts: 1, rallyPoints: 0, hasCommsPlan: false } },
          'plan',
        ),
      ).toMatchObject({
        status: 'attention',
        detail: 'Missing rally point, comms plan',
        action: 'emergency-plan',
      });
    });

    it('is not started with nothing filled in', () => {
      expect(
        item(
          { plan: { contacts: 0, rallyPoints: 0, hasCommsPlan: false } },
          'plan',
        ),
      ).toMatchObject({ status: 'missing', detail: 'Not started' });
    });
  });
});
