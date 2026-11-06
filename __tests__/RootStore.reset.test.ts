/**
 * @format
 */

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const setupRootStoreModule = async ({
  notesDbSequence,
  coldModeSequence = [],
}: {
  notesDbSequence: Array<Record<string, unknown> | null>;
  coldModeSequence?: boolean[];
}) => {
  const mockWeatherOutlookStoreInstances: Array<{
    initDatabase: jest.Mock<Promise<void>, [Record<string, unknown>]>;
    start: jest.Mock<void, [unknown]>;
    dispose: jest.Mock<void, []>;
  }> = [];
  const mockBarometerStoreInstances: Array<{
    start: jest.Mock<Promise<void>, [Record<string, unknown>]>;
    stop: jest.Mock<void, []>;
    setPaused: jest.Mock<void, [boolean]>;
  }> = [];
  const mockCoreStoreInstances: Array<{
    setGpsIntervalMs: jest.Mock<void, [number]>;
  }> = [];
  const mockSettingsStoreInstances: Array<{
    coldMode: boolean;
    setColdMode: (coldMode: boolean) => void;
  }> = [];

  const makeDisposableStore = () =>
    class {
      dispose = jest.fn();
    };

  const makeInitDatabaseStore = () =>
    class {
      initDatabase = jest.fn(async () => undefined);
      dispose = jest.fn();
    };

  jest.resetModules();
  const { makeAutoObservable, runInAction } = require('mobx');

  jest.doMock('../src/stores/AstronomyEventStore', () => ({
    AstronomyEventStore: class {
      start = jest.fn();
      stop = jest.fn();
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/BarometerStore', () => ({
    BarometerStore: class {
      start = jest.fn(async () => undefined);
      stop = jest.fn();
      setPaused = jest.fn();

      constructor() {
        mockBarometerStoreInstances.push(
          this as unknown as (typeof mockBarometerStoreInstances)[number],
        );
      }
    },
  }));
  jest.doMock('../src/stores/ChecklistStore', () => ({
    ChecklistStore: class {
      initDatabase = jest.fn(async () => undefined);
      loadChecklists = jest.fn(async () => undefined);
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/CoreStore', () => ({
    GPS_INTERVAL_MS: 60_000,
    COLD_MODE_GPS_INTERVAL_MS: 600_000,
    CoreStore: class {
      startDeviceStatusMonitoring = jest.fn();
      setGpsIntervalMs = jest.fn();
      dispose = jest.fn();

      constructor() {
        mockCoreStoreInstances.push(
          this as unknown as (typeof mockCoreStoreInstances)[number],
        );
      }
    },
  }));
  jest.doMock('../src/stores/DevToolsStore', () => ({
    DevToolsStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/EmergencyPlanStore', () => ({
    EmergencyPlanStore: makeInitDatabaseStore(),
  }));
  jest.doMock('../src/stores/InventoryStore', () => ({
    InventoryStore: makeInitDatabaseStore(),
  }));
  jest.doMock('../src/stores/NavigationStore', () => ({
    NavigationStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/NotesStore', () => ({
    NotesStore: class {
      notesDb = notesDbSequence.shift() ?? null;
      initNotesDb = jest.fn(async () => undefined);
      loadCategories = jest.fn(async () => undefined);
      loadNotes = jest.fn(async () => undefined);
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/NotificationsStore', () => ({
    NotificationsStore: class {
      loadHiddenKeys = jest.fn(async () => undefined);
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/OfflineDownloadStore', () => ({
    OfflineDownloadStore: class {
      recover = jest.fn(async () => undefined);
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/PantryStore', () => ({
    PantryStore: makeInitDatabaseStore(),
  }));
  jest.doMock('../src/stores/RepeaterBookStore', () => ({
    RepeaterBookStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/SettingsStore', () => ({
    SettingsStore: class {
      loadSettings = jest.fn(async () => {
        const coldMode = coldModeSequence.shift() ?? false;
        await Promise.resolve();
        runInAction(() => {
          this.coldMode = coldMode;
        });
      });
      coldMode = false;
      setColdMode = (coldMode: boolean) => {
        runInAction(() => {
          this.coldMode = coldMode;
        });
      };

      constructor() {
        makeAutoObservable(this, { loadSettings: false });
        mockSettingsStoreInstances.push(this);
      }
    },
  }));
  jest.doMock('../src/stores/SignalingStore', () => ({
    SignalingStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/SignalsStore', () => ({
    SignalsStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/SolarCycleNotificationStore', () => ({
    SolarCycleNotificationStore: class {
      initDatabase = jest.fn(async () => undefined);
      loadSettings = jest.fn(async () => undefined);
      start = jest.fn();
      stop = jest.fn();
      dispose = jest.fn();
    },
  }));
  jest.doMock('../src/stores/TrackStore', () => ({
    TrackStore: makeInitDatabaseStore(),
  }));
  jest.doMock('../src/stores/WaypointStore', () => ({
    WaypointStore: makeInitDatabaseStore(),
  }));
  jest.doMock('../src/stores/WeatherOutlookStore', () => ({
    WeatherOutlookStore: class {
      initDatabase = jest.fn(async () => undefined);
      start = jest.fn();
      dispose = jest.fn();

      constructor() {
        mockWeatherOutlookStoreInstances.push(
          this as unknown as (typeof mockWeatherOutlookStoreInstances)[number],
        );
      }
    },
  }));

  const { RootStore } = require('../src/stores/RootStore');

  return {
    RootStore,
    mockBarometerStoreInstances,
    mockCoreStoreInstances,
    mockSettingsStoreInstances,
    mockWeatherOutlookStoreInstances,
  };
};

describe('RootStore reset lifecycle', () => {
  test('does not restart DB-backed stores when reset leaves notesDb unavailable', async () => {
    const {
      RootStore,
      mockBarometerStoreInstances,
      mockWeatherOutlookStoreInstances,
    } = await setupRootStoreModule({
      notesDbSequence: [{ name: 'initial-db' }, null],
    });

    const rootStore = new RootStore();
    await rootStore.startupPromise;

    rootStore.reset();
    await rootStore.startupPromise;
    await flushPromises();

    const resetBarometerStore =
      mockBarometerStoreInstances[mockBarometerStoreInstances.length - 1];
    const resetWeatherOutlookStore =
      mockWeatherOutlookStoreInstances[
        mockWeatherOutlookStoreInstances.length - 1
      ];

    expect(resetWeatherOutlookStore.start).not.toHaveBeenCalled();
    expect(resetBarometerStore.start).not.toHaveBeenCalled();
  });

  test('tracks loaded and changed Cold mode settings across reset', async () => {
    const {
      RootStore,
      mockBarometerStoreInstances,
      mockCoreStoreInstances,
      mockSettingsStoreInstances,
    } = await setupRootStoreModule({
      notesDbSequence: [{ name: 'initial-db' }, { name: 'reset-db' }],
      coldModeSequence: [true, true],
    });

    const rootStore = new RootStore();
    await rootStore.startupPromise;

    const oldSettings = mockSettingsStoreInstances[0];
    const oldCore = mockCoreStoreInstances[0];
    const oldBarometer = mockBarometerStoreInstances[0];
    expect(oldCore.setGpsIntervalMs).toHaveBeenLastCalledWith(600_000);
    expect(oldBarometer.setPaused).toHaveBeenLastCalledWith(true);

    oldSettings.setColdMode(false);
    expect(oldCore.setGpsIntervalMs).toHaveBeenLastCalledWith(60_000);
    expect(oldBarometer.setPaused).toHaveBeenLastCalledWith(false);

    oldSettings.setColdMode(true);
    expect(oldCore.setGpsIntervalMs).toHaveBeenLastCalledWith(600_000);
    expect(oldBarometer.setPaused).toHaveBeenLastCalledWith(true);

    rootStore.reset();
    await rootStore.startupPromise;
    await flushPromises();

    const core = mockCoreStoreInstances[mockCoreStoreInstances.length - 1];
    const barometer =
      mockBarometerStoreInstances[mockBarometerStoreInstances.length - 1];
    const settings =
      mockSettingsStoreInstances[mockSettingsStoreInstances.length - 1];
    expect(core).not.toBe(oldCore);
    expect(core.setGpsIntervalMs).toHaveBeenLastCalledWith(600_000);
    expect(barometer.setPaused).toHaveBeenLastCalledWith(true);

    const oldCoreCalls = oldCore.setGpsIntervalMs.mock.calls.length;
    const oldBarometerCalls = oldBarometer.setPaused.mock.calls.length;
    oldSettings.setColdMode(false);
    oldSettings.setColdMode(true);
    expect(oldCore.setGpsIntervalMs).toHaveBeenCalledTimes(oldCoreCalls);
    expect(oldBarometer.setPaused).toHaveBeenCalledTimes(oldBarometerCalls);

    settings.setColdMode(false);
    expect(core.setGpsIntervalMs).toHaveBeenLastCalledWith(60_000);
    expect(barometer.setPaused).toHaveBeenLastCalledWith(false);

    settings.setColdMode(true);
    expect(core.setGpsIntervalMs).toHaveBeenLastCalledWith(600_000);
    expect(barometer.setPaused).toHaveBeenLastCalledWith(true);
  });
});
