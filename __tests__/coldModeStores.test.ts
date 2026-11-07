import { barometer } from 'react-native-sensors';
import { BarometerStore } from '../src/stores/BarometerStore';
import {
  COLD_MODE_GPS_INTERVAL_MS,
  CoreStore,
  GPS_INTERVAL_MS,
} from '../src/stores/CoreStore';
import { SQLiteDatabase } from '../src/types/database-types';

const makeDb = () =>
  ({
    executeSql: jest
      .fn()
      .mockResolvedValue([{ rows: { length: 0, item: () => ({}) } }]),
  }) as unknown as SQLiteDatabase;

describe('CoreStore.setGpsIntervalMs', () => {
  type Internals = {
    gpsIv: ReturnType<typeof setInterval> | null;
    gpsGetFix: () => void;
  };

  let core: CoreStore;
  let internals: Internals;
  let fix: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    core = new CoreStore();
    internals = core as unknown as Internals;
    fix = jest.fn();
    internals.gpsGetFix = fix;
  });

  afterEach(() => {
    core.dispose();
    jest.useRealTimers();
  });

  /** Starts a poll the way startGpsPolling does, minus the permission flow. */
  const startPoll = () => {
    internals.gpsIv = setInterval(
      () => internals.gpsGetFix(),
      core.gpsIntervalMs,
    );
  };

  it('polls every minute by default', () => {
    expect(core.gpsIntervalMs).toBe(GPS_INTERVAL_MS);
  });

  it('re-times a running poll to every 10 minutes in Cold mode', () => {
    startPoll();
    core.setGpsIntervalMs(COLD_MODE_GPS_INTERVAL_MS);

    jest.advanceTimersByTime(9 * 60_000);
    expect(fix).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(fix).toHaveBeenCalledTimes(1);
  });

  it('takes a fix straight away when speeding back up', () => {
    startPoll();
    core.setGpsIntervalMs(COLD_MODE_GPS_INTERVAL_MS);
    core.setGpsIntervalMs(GPS_INTERVAL_MS);

    expect(fix).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    expect(fix).toHaveBeenCalledTimes(2);
  });

  it('only records the interval when no poll is running', () => {
    core.setGpsIntervalMs(COLD_MODE_GPS_INTERVAL_MS);

    expect(core.gpsIntervalMs).toBe(COLD_MODE_GPS_INTERVAL_MS);
    expect(fix).not.toHaveBeenCalled();
    expect(internals.gpsIv).toBeNull();
  });
});

describe('BarometerStore.setPaused', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not subscribe at start while paused, and stops waiting', async () => {
    const store = new BarometerStore();
    store.setPaused(true);
    await store.start(makeDb());

    expect(barometer.subscribe).not.toHaveBeenCalled();
    expect(store.loading).toBe(false);
  });

  it('unsubscribes when paused and resubscribes when resumed', async () => {
    const unsubscribe = jest.fn();
    (barometer.subscribe as jest.Mock).mockReturnValue({ unsubscribe });
    const store = new BarometerStore();
    await store.start(makeDb());
    expect(barometer.subscribe).toHaveBeenCalledTimes(1);

    store.setPaused(true);
    expect(unsubscribe).toHaveBeenCalled();
    expect(store.paused).toBe(true);

    store.setPaused(false);
    expect(barometer.subscribe).toHaveBeenCalledTimes(2);
    expect(store.paused).toBe(false);
  });

  it('does not subscribe on resume before start has a database', () => {
    const store = new BarometerStore();
    store.setPaused(true);
    store.setPaused(false);

    expect(barometer.subscribe).not.toHaveBeenCalled();
  });
});
