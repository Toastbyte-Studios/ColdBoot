/**
 * @format
 */

import { makeAutoObservable, runInAction } from 'mobx';
import { weatherOutlookSeasonalResponseFixture } from '../src/services/testFixtures/weatherOutlookSeasonalResponse';
import {
  CACHE_MAX_AGE_MS,
  fetchSeasonalData,
  getCachedOutlook,
  initCacheTable,
  parseMonthlyResponse,
  roundCoord,
  saveOutlookToCache,
  SeasonalOutlook,
  shouldRefresh,
  toYearMonth,
} from '../src/services/weatherOutlookService';
import { WeatherOutlookStore } from '../src/stores/WeatherOutlookStore';
import { SQLiteDatabase } from '../src/types/database-types';
import type { CoreStore } from '../src/stores/CoreStore';

const mockRemoveAppStateListener = jest.fn();
let appStateChangeHandler: ((nextState: string) => void) | null = null;

const mockAddEventListener = jest.fn(
  (_event: string, handler: (nextState: string) => void) => {
    appStateChangeHandler = handler;
    return { remove: mockRemoveAppStateListener };
  },
);

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (...args: [string, (nextState: string) => void]) =>
      mockAddEventListener(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDb = (rows: { data: string }[] = [], executeSqlImpl?: jest.Mock) => ({
  executeSql:
    executeSqlImpl ??
    jest.fn().mockResolvedValue([
      {
        rows: {
          length: rows.length,
          item: (i: number) => rows[i],
        },
      },
    ]),
});

const makeMutableDb = (
  getRows: () => { data: string }[],
  executeSqlImpl?: jest.Mock,
) => ({
  executeSql:
    executeSqlImpl ??
    jest.fn().mockImplementation((sql: string) => {
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return Promise.resolve([{ rows: { length: 0, item: () => null } }]);
      }

      const rows = getRows();
      return Promise.resolve([
        {
          rows: {
            length: rows.length,
            item: (i: number) => rows[i],
          },
        },
      ]);
    }),
});

class FakeCoreStore {
  lastFix: { coords: { latitude: number; longitude: number } } | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
}

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const sampleOutlook: SeasonalOutlook = {
  lat: 36.2,
  lon: -115.1,
  fetchedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago → fresh
  fetchMonth: toYearMonth(),
  months: [
    {
      month: '2024-03',
      tempMeanC: 13,
      precipMm: 30,
      snowfallCm: 0,
      windSpeedMeanKmh: 25,
      shortwaveRadiationSum: 400,
    },
    {
      month: '2024-04',
      tempMeanC: 18,
      precipMm: 55,
      snowfallCm: 0,
      windSpeedMeanKmh: 35,
      shortwaveRadiationSum: 520,
    },
  ],
};

// ---------------------------------------------------------------------------
// weatherOutlookService unit tests
// ---------------------------------------------------------------------------

describe('roundCoord', () => {
  test('rounds to 1 decimal place', () => {
    expect(roundCoord(36.17)).toBe(36.2);
    expect(roundCoord(-115.14)).toBe(-115.1);
    expect(roundCoord(0)).toBe(0);
    expect(roundCoord(1.05)).toBe(1.1);
  });
});

describe('toYearMonth', () => {
  test('returns YYYY-MM format', () => {
    const result = toYearMonth(new Date('2024-03-15'));
    expect(result).toBe('2024-03');
  });

  test('pads single-digit months with zero', () => {
    const result = toYearMonth(new Date('2024-01-01'));
    expect(result).toBe('2024-01');
  });
});

describe('shouldRefresh', () => {
  test('returns false for a freshly fetched cache entry', () => {
    const recent = new Date(Date.now() - 1000).toISOString();
    expect(shouldRefresh(recent)).toBe(false);
  });

  test('returns true when cache is older than 30 days', () => {
    const old = new Date(Date.now() - CACHE_MAX_AGE_MS - 1000).toISOString();
    expect(shouldRefresh(old)).toBe(true);
  });

  test('returns false exactly at the 30-day threshold', () => {
    const onThreshold = new Date(
      Date.now() - CACHE_MAX_AGE_MS + 5000,
    ).toISOString();
    expect(shouldRefresh(onThreshold)).toBe(false);
  });
});

describe('parseMonthlyResponse', () => {
  test('reads ensemble-mean monthly series from a fixture response', () => {
    const entries = parseMonthlyResponse(
      weatherOutlookSeasonalResponseFixture.monthly,
      weatherOutlookSeasonalResponseFixture.monthly_units,
    );

    expect(entries).toEqual([
      {
        month: '2026-10',
        tempMeanC: 19.2,
        precipMm: 14.6,
        snowfallCm: 0,
        windSpeedMeanKmh: 24.9,
        shortwaveRadiationSum: 512.3,
      },
      {
        month: '2026-11',
        tempMeanC: 12.4,
        precipMm: 22.1,
        snowfallCm: 1.8,
        windSpeedMeanKmh: 31.4,
        shortwaveRadiationSum: 381.7,
      },
    ]);
  });

  test('handles empty time array', () => {
    expect(parseMonthlyResponse({ time: [] })).toEqual([]);
  });

  test('handles missing monthly series gracefully (returns 0)', () => {
    const monthly: Record<string, unknown> = {
      time: ['2024-03-01'],
    };
    const entries = parseMonthlyResponse(monthly);
    expect(entries).toHaveLength(1);
    expect(entries[0].tempMeanC).toBe(0);
  });

  test('converts per-day and power units to existing UI semantics', () => {
    const monthly: Record<string, unknown> = {
      time: ['2024-02-01'],
      temperature_2m_mean: [68],
      precipitation_mean: [2],
      snowfall_mean: [0.5],
      wind_speed_10m_mean: [10],
      shortwave_radiation_mean: [100],
    };
    const monthlyUnits: Record<string, unknown> = {
      temperature_2m_mean: '°F',
      precipitation_mean: 'mm/day',
      snowfall_mean: 'inch/day',
      wind_speed_10m_mean: 'mph',
      shortwave_radiation_mean: 'W/m²',
    };

    const [entry] = parseMonthlyResponse(monthly, monthlyUnits);

    expect(entry.tempMeanC).toBeCloseTo(20, 5);
    expect(entry.precipMm).toBeCloseTo(58, 5);
    expect(entry.snowfallCm).toBeCloseTo(36.83, 2);
    expect(entry.windSpeedMeanKmh).toBeCloseTo(16.09, 2);
    expect(entry.shortwaveRadiationSum).toBeCloseTo(250.56, 2);
  });

  test('slices YYYY-MM from the time string', () => {
    const monthly: Record<string, unknown> = {
      time: ['2024-06-01'],
    };
    const entries = parseMonthlyResponse(monthly);
    expect(entries[0].month).toBe('2024-06');
  });
});

describe('fetchSeasonalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws on non-ok HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ error: true, reason: 'Upstream unavailable' }),
    });

    await expect(fetchSeasonalData(36.17, -115.14)).rejects.toThrow(
      /503: Upstream unavailable/,
    );
  });

  test('falls back to a sensible message when the error body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(fetchSeasonalData(36.17, -115.14)).rejects.toThrow(
      /400: Bad Request/,
    );
  });

  test('throws when response contains no monthly data', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await expect(fetchSeasonalData(36.17, -115.14)).rejects.toThrow(
      /no monthly data/i,
    );
  });

  test('returns SeasonalOutlook with rounded coords on success', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => weatherOutlookSeasonalResponseFixture,
    });

    const result = await fetchSeasonalData(36.17, -115.14);
    expect(result.lat).toBe(36.2);
    expect(result.lon).toBe(-115.1);
    expect(result.months).toHaveLength(2);
    expect(result.months[0]).toMatchObject({
      month: '2026-10',
      precipMm: 14.6,
    });
  });

  test('uses the ensemble-mean model and current monthly variable names in the request URL', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        monthly: { time: ['2024-03-01'] },
      }),
    });

    await fetchSeasonalData(36.2, -115.1);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('models=ecmwf_seas5_ensemble_mean');
    expect(calledUrl).toContain(
      'monthly=temperature_2m_mean%2Cprecipitation_mean%2Csnowfall_mean%2Cwind_speed_10m_mean%2Cshortwave_radiation_mean',
    );
    expect(calledUrl).toContain('temperature_unit=celsius');
    expect(calledUrl).toContain('wind_speed_unit=kmh');
    expect(calledUrl).toContain('precipitation_unit=mm');
    expect(calledUrl).toContain('timezone=GMT');
    expect(calledUrl).not.toContain('models=seas5');
    expect(calledUrl).not.toContain('precipitation_sum');
    expect(calledUrl).not.toContain('snowfall_sum');
    expect(calledUrl).not.toContain('shortwave_radiation_sum');
  });
});

describe('SQLite cache helpers', () => {
  test('initCacheTable calls executeSql with CREATE TABLE', async () => {
    const db = makeDb();
    await initCacheTable(db as SQLiteDatabase);
    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS'),
    );
  });

  test('getCachedOutlook queries using GLOB to find most recent row', async () => {
    const db = makeDb([]);
    await getCachedOutlook(db as SQLiteDatabase, 36.2, -115.1);
    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining('GLOB'),
      expect.arrayContaining([expect.stringContaining('36.2_-115.1_')]),
    );
  });

  test('getCachedOutlook parses and returns cached JSON', async () => {
    const db = makeDb([{ data: JSON.stringify(sampleOutlook) }]);
    const result = await getCachedOutlook(db as SQLiteDatabase, 36.2, -115.1);
    expect(result).not.toBeNull();
    expect(result?.months).toHaveLength(2);
    expect(result?.lat).toBe(36.2);
  });

  test('getCachedOutlook returns null on executeSql error', async () => {
    const failDb = makeDb(
      [],
      jest.fn().mockRejectedValueOnce(new Error('DB error')),
    );
    const result = await getCachedOutlook(
      failDb as SQLiteDatabase,
      36.2,
      -115.1,
    );
    expect(result).toBeNull();
  });

  test('saveOutlookToCache calls executeSql with INSERT OR REPLACE', async () => {
    const db = makeDb();
    await saveOutlookToCache(db as SQLiteDatabase, sampleOutlook);
    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE'),
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// WeatherOutlookStore tests
// ---------------------------------------------------------------------------

describe('WeatherOutlookStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateChangeHandler = null;
    mockAddEventListener.mockClear();
    mockRemoveAppStateListener.mockClear();
  });

  test('initial state is empty / not loading', () => {
    const store = new WeatherOutlookStore();
    expect(store.outlook).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.isStale).toBe(false);
  });

  test('initDatabase creates cache table', async () => {
    const store = new WeatherOutlookStore();
    const db = makeDb();
    await store.initDatabase(db as SQLiteDatabase);
    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS'),
    );
  });

  test('loadOutlook uses fresh cached data without network call', async () => {
    const store = new WeatherOutlookStore();
    const db = makeDb([{ data: JSON.stringify(sampleOutlook) }]);
    await store.initDatabase(db as SQLiteDatabase);

    global.fetch = jest.fn();
    await store.loadOutlook(36.2, -115.1);

    expect(fetch).not.toHaveBeenCalled();
    expect(store.outlook).not.toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.isStale).toBe(false);
  });

  test('loadOutlook fetches from network when cache is stale', async () => {
    const staleOutlook: SeasonalOutlook = {
      ...sampleOutlook,
      fetchedAt: new Date(Date.now() - CACHE_MAX_AGE_MS - 1000).toISOString(),
    };

    const db = makeDb([{ data: JSON.stringify(staleOutlook) }]);
    const store = new WeatherOutlookStore();
    await store.initDatabase(db as SQLiteDatabase);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        monthly_units: {
          temperature_2m_mean: '°C',
          precipitation_mean: 'mm',
          snowfall_mean: 'cm',
          wind_speed_10m_mean: 'km/h',
          shortwave_radiation_mean: 'MJ/m²',
        },
        monthly: {
          time: ['2024-03-01'],
          temperature_2m_mean: [22],
          precipitation_mean: [40],
          snowfall_mean: [0],
          wind_speed_10m_mean: [30],
          shortwave_radiation_mean: [300],
        },
      }),
    });

    await store.loadOutlook(36.2, -115.1);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.outlook).not.toBeNull();
    expect(store.isStale).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  test('loadOutlook degrades gracefully (shows stale cache) when offline', async () => {
    const staleOutlook: SeasonalOutlook = {
      ...sampleOutlook,
      fetchedAt: new Date(Date.now() - CACHE_MAX_AGE_MS - 1000).toISOString(),
    };

    const db = makeDb([{ data: JSON.stringify(staleOutlook) }]);
    const store = new WeatherOutlookStore();
    await store.initDatabase(db as SQLiteDatabase);

    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network request failed'));

    await store.loadOutlook(36.2, -115.1);

    expect(store.outlook).not.toBeNull(); // stale cached data shown
    expect(store.isStale).toBe(true);
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  test('loadOutlook sets error when offline with no cached data', async () => {
    const db = makeDb([]); // no rows
    const store = new WeatherOutlookStore();
    await store.initDatabase(db as SQLiteDatabase);

    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network request failed'));

    await store.loadOutlook(36.2, -115.1);

    expect(store.outlook).toBeNull();
    expect(store.error).toBeTruthy();
    expect(store.isStale).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  describe('getCurrentMonthSummary', () => {
    test('returns null when no outlook is loaded', () => {
      const store = new WeatherOutlookStore();
      expect(store.getCurrentMonthSummary()).toBeNull();
    });

    test('returns null when outlook has no months', () => {
      const store = new WeatherOutlookStore();
      store.outlook = { ...sampleOutlook, months: [] };
      expect(store.getCurrentMonthSummary()).toBeNull();
    });

    test('returns a non-empty summary string when data is loaded', () => {
      const store = new WeatherOutlookStore();
      store.outlook = sampleOutlook;
      const summary = store.getCurrentMonthSummary();
      expect(typeof summary).toBe('string');
      expect(summary!.length).toBeGreaterThan(0);
    });

    test('describes warm conditions for high average temperature', () => {
      const store = new WeatherOutlookStore();
      store.outlook = {
        ...sampleOutlook,
        months: [
          {
            ...sampleOutlook.months[0],
            tempMeanC: 30,
            precipMm: 20,
          },
        ],
      };
      expect(store.getCurrentMonthSummary()).toMatch(/warm/i);
    });

    test('describes cold conditions for low average temperature', () => {
      const store = new WeatherOutlookStore();
      store.outlook = {
        ...sampleOutlook,
        months: [
          {
            ...sampleOutlook.months[0],
            tempMeanC: -2,
            precipMm: 20,
          },
        ],
      };
      expect(store.getCurrentMonthSummary()).toMatch(/cold/i);
    });

    test('describes wet conditions for high precipitation', () => {
      const store = new WeatherOutlookStore();
      store.outlook = {
        ...sampleOutlook,
        months: [
          {
            ...sampleOutlook.months[0],
            tempMeanC: 12,
            precipMm: 200,
          },
        ],
      };
      expect(store.getCurrentMonthSummary()).toMatch(/wet/i);
    });

    test('describes dry conditions for low precipitation', () => {
      const store = new WeatherOutlookStore();
      store.outlook = {
        ...sampleOutlook,
        months: [
          {
            ...sampleOutlook.months[0],
            tempMeanC: 12,
            precipMm: 10,
          },
        ],
      };
      expect(store.getCurrentMonthSummary()).toMatch(/dry/i);
    });
  });

  test('dispose resets all state', () => {
    const store = new WeatherOutlookStore();
    store.outlook = sampleOutlook;
    store.isStale = true;

    store.dispose();

    expect(store.outlook).toBeNull();
    expect(store.isStale).toBe(false);
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  describe('start/stop lifecycle', () => {
    test('start with a fix and fresh cache populates outlook without fetching', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([{ data: JSON.stringify(sampleOutlook) }]);
      await store.initDatabase(db as SQLiteDatabase);
      runInAction(() => {
        core.lastFix = {
          coords: { latitude: sampleOutlook.lat, longitude: sampleOutlook.lon },
        };
      });

      global.fetch = jest.fn();
      store.start(core as unknown as CoreStore);
      await flushPromises();

      expect(fetch).not.toHaveBeenCalled();
      expect(store.outlook).toEqual(sampleOutlook);
      expect(store.getCurrentMonthSummary()).not.toBeNull();
    });

    test('start with a fix and no cache fetches once', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);
      runInAction(() => {
        core.lastFix = {
          coords: { latitude: sampleOutlook.lat, longitude: sampleOutlook.lon },
        };
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      });

      store.start(core as unknown as CoreStore);
      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(store.getCurrentMonthSummary()).not.toBeNull();
    });

    test('start without a fix loads once a fix arrives', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      });

      store.start(core as unknown as CoreStore);
      await flushPromises();
      expect(fetch).not.toHaveBeenCalled();

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: sampleOutlook.lat, longitude: sampleOutlook.lon },
        };
      });
      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(store.outlook).not.toBeNull();
    });

    test('small location changes do not reload, but large ones do', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      });

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 36.2, longitude: -115.1 },
        };
      });
      store.start(core as unknown as CoreStore);
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 36.5, longitude: -114.8 },
        };
      });
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 37.0, longitude: -114.0 },
        };
      });
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('returning to the foreground refreshes expired cache', async () => {
      const staleOutlook: SeasonalOutlook = {
        ...sampleOutlook,
        fetchedAt: new Date(Date.now() - CACHE_MAX_AGE_MS - 1000).toISOString(),
      };

      let rows = [{ data: JSON.stringify(sampleOutlook) }];
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeMutableDb(() => rows);
      await store.initDatabase(db as SQLiteDatabase);
      runInAction(() => {
        core.lastFix = {
          coords: { latitude: sampleOutlook.lat, longitude: sampleOutlook.lon },
        };
      });

      global.fetch = jest.fn();
      store.start(core as unknown as CoreStore);
      await flushPromises();
      expect(fetch).not.toHaveBeenCalled();

      rows = [{ data: JSON.stringify(staleOutlook) }];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      });

      appStateChangeHandler?.('active');
      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('concurrent triggers wait for the current fetch, then replay the latest significant fix', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);

      let resolveFetch: ((value: Response) => void) | null = null;
      global.fetch = jest.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ) as typeof fetch;

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 36.2, longitude: -115.1 },
        };
      });
      store.start(core as unknown as CoreStore);
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 37.0, longitude: -114.0 },
        };
      });
      appStateChangeHandler?.('active');
      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);

      const finishFetch = resolveFetch as ((value: Response) => void) | null;
      if (!finishFetch) {
        throw new Error('Fetch promise was not created');
      }

      finishFetch({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      } as Response);
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(store.outlook).not.toBeNull();
    });

    test('foreground refreshes queued during an in-flight load replay for the same location', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);

      let resolveFirstFetch: ((value: Response) => void) | null = null;
      global.fetch = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveFirstFetch = resolve;
            }),
        )
        .mockResolvedValue({
          ok: true,
          json: async () => weatherOutlookSeasonalResponseFixture,
        } as Response);

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 36.2, longitude: -115.1 },
        };
      });
      store.start(core as unknown as CoreStore);
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      appStateChangeHandler?.('active');
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      const finishFirstFetch = resolveFirstFetch as
        | ((value: Response) => void)
        | null;
      if (!finishFirstFetch) {
        throw new Error('First fetch promise was not created');
      }

      finishFirstFetch({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      } as Response);
      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('stop removes listeners and is idempotent', async () => {
      const store = new WeatherOutlookStore();
      const core = new FakeCoreStore();
      const db = makeDb([]);
      await store.initDatabase(db as SQLiteDatabase);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => weatherOutlookSeasonalResponseFixture,
      });

      store.start(core as unknown as CoreStore);
      store.stop();
      store.stop();

      runInAction(() => {
        core.lastFix = {
          coords: { latitude: 36.2, longitude: -115.1 },
        };
      });
      await flushPromises();

      expect(fetch).not.toHaveBeenCalled();
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });
  });
});
