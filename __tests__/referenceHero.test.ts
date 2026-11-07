import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SunCalc from 'suncalc';
import {
  bookmarksText,
  Conditions,
  currentPressureTrend,
  seasonAt,
  suggestEntry,
  SUGGESTED_ENTRY_IDS,
} from '../src/modules/Reference/referenceHero';
import { getLastRead, recordLastRead } from '../src/utils/lastReadEntry';
import { findReferenceEntry } from '../src/utils/referenceEntries';

const SF = { latitude: 37.77, longitude: -122.42 };
const NOON = new Date('2026-11-07T20:00:00Z'); // midday in San Francisco

const base = (overrides: Partial<Conditions> = {}): Conditions => ({
  now: NOON,
  coldMode: false,
  batteryTemperatureC: null,
  pressureTrend: null,
  ...SF,
  system: 'imperial',
  ...overrides,
});

describe('SUGGESTED_ENTRY_IDS', () => {
  it.each(Object.entries(SUGGESTED_ENTRY_IDS))(
    '%s points at a real entry',
    (_, id) => {
      expect(findReferenceEntry(id)).not.toBeNull();
    },
  );
});

describe('seasonAt', () => {
  it('uses meteorological seasons in the north', () => {
    expect(seasonAt(new Date(2026, 0, 15), SF.latitude)).toBe('winter');
    expect(seasonAt(new Date(2026, 3, 15), SF.latitude)).toBe('spring');
    expect(seasonAt(new Date(2026, 6, 15), SF.latitude)).toBe('summer');
    expect(seasonAt(new Date(2026, 10, 7), SF.latitude)).toBe('fall');
    expect(seasonAt(new Date(2026, 11, 1), SF.latitude)).toBe('winter');
  });

  it('flips south of the equator', () => {
    expect(seasonAt(new Date(2026, 6, 15), -33.9)).toBe('winter');
    expect(seasonAt(new Date(2026, 10, 7), -33.9)).toBe('spring');
  });

  it('assumes the north without a fix', () => {
    expect(seasonAt(new Date(2026, 6, 15), null)).toBe('summer');
  });
});

describe('suggestEntry', () => {
  it('falls back to the season', () => {
    expect(suggestEntry(base())).toEqual({
      id: SUGGESTED_ENTRY_IDS.fall,
      reason: 'In season: fall',
    });
  });

  it('turns to shelter within the hour before sunset', () => {
    const sunset = SunCalc.getTimes(NOON, SF.latitude, SF.longitude).sunset;
    const now = new Date(sunset.getTime() - 42 * 60 * 1000);
    expect(suggestEntry(base({ now }))).toEqual({
      id: SUGGESTED_ENTRY_IDS.shelter,
      reason: 'Sunset in 42 min',
      tone: 'fair',
    });
  });

  it('ignores sunset without a fix', () => {
    const sunset = SunCalc.getTimes(NOON, SF.latitude, SF.longitude).sunset;
    const now = new Date(sunset.getTime() - 10 * 60 * 1000);
    expect(
      suggestEntry(base({ now, latitude: null, longitude: null })).id,
    ).not.toBe(SUGGESTED_ENTRY_IDS.shelter);
  });

  it('puts falling pressure ahead of sunset', () => {
    const sunset = SunCalc.getTimes(NOON, SF.latitude, SF.longitude).sunset;
    const now = new Date(sunset.getTime() - 10 * 60 * 1000);
    expect(suggestEntry(base({ now, pressureTrend: 'Falling' }))).toEqual({
      id: SUGGESTED_ENTRY_IDS.storm,
      reason: 'Pressure falling',
      tone: 'fair',
    });
  });

  it('puts cold first', () => {
    expect(
      suggestEntry(base({ coldMode: true, pressureTrend: 'Falling' })),
    ).toMatchObject({
      id: SUGGESTED_ENTRY_IDS.hypothermia,
      reason: 'Cold mode is on',
    });
    expect(
      suggestEntry(base({ batteryTemperatureC: -2, system: 'metric' })),
    ).toMatchObject({
      id: SUGGESTED_ENTRY_IDS.hypothermia,
      reason: 'Battery at −2 °C',
    });
  });

  it('ignores a warm battery', () => {
    expect(suggestEntry(base({ batteryTemperatureC: 30 })).id).toBe(
      SUGGESTED_ENTRY_IDS.fall,
    );
  });
});

describe('currentPressureTrend', () => {
  const now = NOON.getTime();
  const falling = Array.from({ length: 13 }, (_, i) => ({
    timestamp: now - (12 - i) * 15 * 60 * 1000,
    pressure: 1015 - i * 0.5,
  }));

  it('reads the 3-hour trend', () => {
    expect(currentPressureTrend(falling, false, now)).toBe('Falling');
  });

  it('is null when paused or short of history', () => {
    expect(currentPressureTrend(falling, true, now)).toBeNull();
    expect(currentPressureTrend(falling.slice(-2), false, now)).toBeNull();
  });
});

describe('bookmarksText', () => {
  it('says none or how many', () => {
    expect(bookmarksText(0)).toBe('None yet');
    expect(bookmarksText(3)).toBe('3 saved');
  });
});

describe('lastReadEntry', () => {
  // The shared mock is bare jest.fns; back it with a map for a round trip.
  const stored = new Map<string, string>();
  beforeEach(() => {
    stored.clear();
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation(async (key: string) => stored.get(key) ?? null);
    jest
      .mocked(AsyncStorage.setItem)
      .mockImplementation(async (key: string, value: string) => {
        stored.set(key, value);
      });
  });

  it('round-trips the last entry', async () => {
    await recordLastRead('illness_hypothermia', 1000);
    expect(await getLastRead()).toEqual({
      id: 'illness_hypothermia',
      openedAt: 1000,
    });
  });

  it('is null when nothing or junk is stored', async () => {
    expect(await getLastRead()).toBeNull();
    stored.set('@reference/last_read', '{"id":5}');
    expect(await getLastRead()).toBeNull();
    stored.set('@reference/last_read', 'not json');
    expect(await getLastRead()).toBeNull();
  });
});
