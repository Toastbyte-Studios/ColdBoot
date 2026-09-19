/**
 * @format
 */

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const setupRootStoreModule = async ({
  notesDbSequence,
}: {
  notesDbSequence: Array<Record<string, unknown> | null>;
}) => {
  const mockWeatherOutlookStoreInstances: Array<{
    initDatabase: jest.Mock<Promise<void>, [Record<string, unknown>]>;
    start: jest.Mock<void, [unknown]>;
    dispose: jest.Mock<void, []>;
  }> = [];
  const mockBarometerStoreInstances: Array<{
    start: jest.Mock<Promise<void>, [Record<string, unknown>]>;
    stop: jest.Mock<void, []>;
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
    CoreStore: class {
      startDeviceStatusMonitoring = jest.fn();
      dispose = jest.fn();
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
  jest.doMock('../src/stores/ReferenceStore', () => ({
    ReferenceStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/RepeaterBookStore', () => ({
    RepeaterBookStore: makeDisposableStore(),
  }));
  jest.doMock('../src/stores/SettingsStore', () => ({
    SettingsStore: class {
      loadSettings = jest.fn(async () => undefined);
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
});
