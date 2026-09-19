/**
 * @format
 */

import { makeAutoObservable, runInAction } from 'mobx';
import { SolarCycleNotificationStore } from '../src/stores/SolarCycleNotificationStore';
import type { CoreStore } from '../src/stores/CoreStore';

/**
 * Regression tests for sunrise/sunset alerts never appearing.
 *
 * The only caller of `updateNotifications` used to be the old footer, which
 * the tab bar replaced, so nothing populated the store in the running app.
 * `start(core)` now owns that, the same way AstronomyEventStore does.
 */

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

class FakeCoreStore {
  lastFix: { coords: { latitude: number; longitude: number } } | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
}

// New York. At 08:00 UTC (04:00 local) on 1 March, every event of the day
// — dawn, sunrise, sunset, dusk — is still ahead.
const NYC = { latitude: 40.7128, longitude: -74.006 };
const EARLY_MORNING = new Date('2025-03-01T08:00:00Z');

describe('SolarCycleNotificationStore start/stop', () => {
  let store: SolarCycleNotificationStore;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(EARLY_MORNING);
    appStateChangeHandler = null;
    mockAddEventListener.mockClear();
    mockRemoveAppStateListener.mockClear();
    store = new SolarCycleNotificationStore();
  });

  afterEach(() => {
    store.dispose();
    jest.useRealTimers();
  });

  test('start with a fix creates sunrise and sunset alerts', () => {
    const core = new FakeCoreStore();
    runInAction(() => {
      core.lastFix = { coords: NYC };
    });

    store.start(core as unknown as CoreStore);

    const types = store.upcomingNotifications.map((n) => n.eventType);
    expect(types).toEqual(
      expect.arrayContaining(['dawn', 'sunrise', 'sunset', 'dusk']),
    );
  });

  test('start without a fix creates nothing, then a fix populates alerts', () => {
    const core = new FakeCoreStore();

    store.start(core as unknown as CoreStore);
    expect(store.activeNotifications).toHaveLength(0);

    runInAction(() => {
      core.lastFix = { coords: NYC };
    });

    expect(
      store.upcomingNotifications.some((n) => n.eventType === 'sunset'),
    ).toBe(true);
  });

  test('upcomingNotifications drops events that have already happened', () => {
    const core = new FakeCoreStore();
    runInAction(() => {
      core.lastFix = { coords: NYC };
    });
    store.start(core as unknown as CoreStore);

    const sunset = store.activeNotifications.find(
      (n) => n.eventType === 'sunset',
    );
    expect(sunset).toBeDefined();

    // Move past sunset and let the minute tick refresh currentTime.
    jest.setSystemTime(new Date(sunset!.eventTime.getTime() + 60 * 1000));
    jest.advanceTimersByTime(60 * 1000);

    expect(
      store.upcomingNotifications.some((n) => n.eventType === 'sunset'),
    ).toBe(false);
  });

  test('the minute tick recalculates when the date rolls over', () => {
    const core = new FakeCoreStore();
    runInAction(() => {
      core.lastFix = { coords: NYC };
    });
    store.start(core as unknown as CoreStore);
    const firstDay = store.lastCalculationDate?.toDateString();

    jest.setSystemTime(new Date('2025-03-02T08:00:00Z'));
    jest.advanceTimersByTime(60 * 1000);

    expect(store.lastCalculationDate?.toDateString()).not.toBe(firstDay);
    expect(
      store.upcomingNotifications.some((n) => n.eventType === 'sunrise'),
    ).toBe(true);
  });

  test('returning to the foreground refreshes', () => {
    const core = new FakeCoreStore();
    runInAction(() => {
      core.lastFix = { coords: NYC };
    });
    store.start(core as unknown as CoreStore);
    const firstDay = store.lastCalculationDate?.toDateString();

    jest.setSystemTime(new Date('2025-03-02T08:00:00Z'));
    appStateChangeHandler?.('active');

    expect(store.lastCalculationDate?.toDateString()).not.toBe(firstDay);
  });

  test('stop disposes the reaction, tick and AppState listener', () => {
    const core = new FakeCoreStore();
    store.start(core as unknown as CoreStore);

    store.stop();
    store.stop(); // idempotent

    runInAction(() => {
      core.lastFix = { coords: NYC };
    });
    jest.advanceTimersByTime(5 * 60 * 1000);

    expect(store.activeNotifications).toHaveLength(0);
    expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
  });
});
