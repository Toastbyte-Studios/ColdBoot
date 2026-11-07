import { IReactionDisposer, makeAutoObservable, reaction } from 'mobx';
import { AstronomyEventStore } from './AstronomyEventStore';
import { BarometerStore } from './BarometerStore';
import { ChecklistStore } from './ChecklistStore';
import {
  COLD_MODE_GPS_INTERVAL_MS,
  CoreStore,
  GPS_INTERVAL_MS,
} from './CoreStore';
import { DevToolsStore } from './DevToolsStore';
import { EmergencyPlanStore } from './EmergencyPlanStore';
import { InventoryStore } from './InventoryStore';
import { NavigationStore } from './NavigationStore';
import { NotesStore } from './NotesStore';
import { NotificationsStore } from './NotificationsStore';
import { OfflineDownloadStore } from './OfflineDownloadStore';
import { OfflineMapLibraryStore } from './OfflineMapLibraryStore';
import { PantryStore } from './PantryStore';
import { RepeaterBookStore } from './RepeaterBookStore';
import { SettingsStore } from './SettingsStore';
import { SignalingStore } from './SignalingStore';
import { SignalsStore } from './SignalsStore';
import { SolarCycleNotificationStore } from './SolarCycleNotificationStore';
import { TrackStore } from './TrackStore';
import { WaypointStore } from './WaypointStore';
import { WeatherOutlookStore } from './WeatherOutlookStore';

export class RootStore {
  startupPromise: Promise<void>;
  private resetGeneration: number = 0;
  coreStore: CoreStore;
  notesStore: NotesStore;
  checklistStore: ChecklistStore;
  inventoryStore: InventoryStore;
  pantryStore: PantryStore;
  emergencyPlanStore: EmergencyPlanStore;
  navigationStore: NavigationStore;
  settingsStore: SettingsStore;
  signalingStore: SignalingStore;
  signalsStore: SignalsStore;
  solarCycleNotificationStore: SolarCycleNotificationStore;
  notificationsStore: NotificationsStore;
  barometerStore: BarometerStore;
  repeaterBookStore: RepeaterBookStore;
  weatherOutlookStore: WeatherOutlookStore;
  waypointStore: WaypointStore;
  trackStore: TrackStore;
  astronomyEventStore: AstronomyEventStore;
  offlineDownloadStore: OfflineDownloadStore;
  offlineMapLibraryStore: OfflineMapLibraryStore;
  devToolsStore: DevToolsStore;

  private coldModeReaction: IReactionDisposer | null = null;

  constructor() {
    makeAutoObservable<RootStore, 'coldModeReaction'>(this, {
      coldModeReaction: false,
    });
    this.coreStore = new CoreStore();
    this.notesStore = new NotesStore();
    this.checklistStore = new ChecklistStore();
    this.inventoryStore = new InventoryStore();
    this.pantryStore = new PantryStore();
    this.emergencyPlanStore = new EmergencyPlanStore();
    this.navigationStore = new NavigationStore();
    this.settingsStore = new SettingsStore();
    this.signalingStore = new SignalingStore();
    this.signalsStore = new SignalsStore();
    this.solarCycleNotificationStore = new SolarCycleNotificationStore();
    this.notificationsStore = new NotificationsStore();
    this.barometerStore = new BarometerStore();
    this.repeaterBookStore = new RepeaterBookStore();
    this.weatherOutlookStore = new WeatherOutlookStore();
    this.waypointStore = new WaypointStore();
    this.trackStore = new TrackStore();
    this.astronomyEventStore = new AstronomyEventStore();
    this.offlineDownloadStore = new OfflineDownloadStore();
    this.offlineMapLibraryStore = new OfflineMapLibraryStore();
    this.devToolsStore = new DevToolsStore();
    this.startupPromise = this.initializeSettings();
    this.watchColdMode();
  }

  /**
   * Applies Cold mode to the stores that use the battery in the background:
   * GPS polls every 10 minutes instead of every minute, and the barometer
   * stops. It reacts to the setting, so the value loaded from the database
   * after startup takes effect too.
   *
   * The store fields here are not observable (they are assigned after
   * makeAutoObservable runs), so the reaction can't see `reset()` swap them;
   * `reset()` calls this again to bind it to the fresh stores.
   */
  private watchColdMode() {
    this.coldModeReaction?.();
    const settings = this.settingsStore;
    const core = this.coreStore;
    const barometer = this.barometerStore;
    this.coldModeReaction = reaction(
      () => settings.coldMode,
      (coldMode) => {
        core.setGpsIntervalMs(
          coldMode ? COLD_MODE_GPS_INTERVAL_MS : GPS_INTERVAL_MS,
        );
        barometer.setPaused(coldMode);
      },
      { fireImmediately: true },
    );
  }

  /**
   * Initialize settings by loading them from the database
   */
  private async initializeSettings() {
    // Load persisted notification hidden keys first — AsyncStorage-based,
    // no SQLite dependency, avoids a brief window where dismissed notifications reappear.
    await this.notificationsStore.loadHiddenKeys();
    // Recover any in-progress offline download and re-attach listeners.
    // AsyncStorage-based and safe to run before the SQLite DB is ready.
    await this.offlineDownloadStore.recover();
    // Wait for NotesStore to initialize the database, then load categories and settings
    await this.notesStore.initNotesDb();
    if (this.notesStore.notesDb) {
      // Load categories first to ensure dependent logic sees a consistent category list
      await this.notesStore.loadCategories();
      await this.checklistStore.initDatabase(this.notesStore.notesDb);
      await this.settingsStore.loadSettings(this.notesStore.notesDb);
      // Initialize solar cycle notification store with same database
      await this.solarCycleNotificationStore.initDatabase(
        this.notesStore.notesDb,
      );
      await this.solarCycleNotificationStore.loadSettings();
      // Initialize weather outlook cache table
      await this.weatherOutlookStore.initDatabase(this.notesStore.notesDb);
      // Initialize waypoint store with same database
      await this.waypointStore.initDatabase(this.notesStore.notesDb);
      // Initialize track store with same database
      await this.trackStore.initDatabase(this.notesStore.notesDb);
    }
    // Initialize inventory and pantry databases
    await this.inventoryStore.initDatabase();
    await this.pantryStore.initDatabase();
    await this.emergencyPlanStore.initDatabase();
  }

  // Global app state
  isOfflineMode: boolean = true;

  toggleOfflineMode() {
    this.isOfflineMode = !this.isOfflineMode;
  }

  // Reset all stores
  reset() {
    this.coreStore.dispose();
    this.signalingStore.dispose();
    this.notesStore.dispose();
    this.checklistStore.dispose();
    this.inventoryStore.dispose();
    this.pantryStore.dispose();
    this.emergencyPlanStore.dispose();
    this.solarCycleNotificationStore.dispose();
    this.barometerStore.stop();
    this.repeaterBookStore.dispose();
    this.weatherOutlookStore.dispose();
    this.waypointStore.dispose();
    this.trackStore.dispose();
    this.astronomyEventStore.dispose();
    this.offlineDownloadStore.dispose();
    // Restore the network connection before discarding the dev store, so a
    // reset while simulated-offline is active doesn't leave MapLibre stuck
    // disconnected against the fresh (connected) store below.
    this.devToolsStore.dispose();
    this.coreStore = new CoreStore();
    this.notesStore = new NotesStore();
    this.checklistStore = new ChecklistStore();
    this.inventoryStore = new InventoryStore();
    this.pantryStore = new PantryStore();
    this.emergencyPlanStore = new EmergencyPlanStore();
    this.navigationStore = new NavigationStore();
    this.settingsStore = new SettingsStore();
    this.signalingStore = new SignalingStore();
    this.signalsStore = new SignalsStore();
    this.solarCycleNotificationStore = new SolarCycleNotificationStore();
    this.notificationsStore = new NotificationsStore();
    this.barometerStore = new BarometerStore();
    this.repeaterBookStore = new RepeaterBookStore();
    this.weatherOutlookStore = new WeatherOutlookStore();
    this.waypointStore = new WaypointStore();
    this.trackStore = new TrackStore();
    this.astronomyEventStore = new AstronomyEventStore();
    this.offlineDownloadStore = new OfflineDownloadStore();
    this.offlineMapLibraryStore = new OfflineMapLibraryStore();
    this.devToolsStore = new DevToolsStore();
    this.watchColdMode();
    this.coreStore.startDeviceStatusMonitoring();
    this.astronomyEventStore.start(this.coreStore);
    this.solarCycleNotificationStore.start(this.coreStore);
    this.isOfflineMode = true;
    // initializeSettings is intentionally not awaited - settings have sensible
    // defaults and components will re-render when settings finish loading from DB
    const startupPromise = this.initializeSettings();
    const resetGeneration = ++this.resetGeneration;
    this.startupPromise = startupPromise;
    startupPromise
      .then(() => {
        if (
          this.resetGeneration !== resetGeneration ||
          this.startupPromise !== startupPromise
        ) {
          return;
        }
        if (this.notesStore.notesDb) {
          this.weatherOutlookStore.start(this.coreStore);
          this.barometerStore.start(this.notesStore.notesDb).catch((e) => {
            console.warn('Failed to restart barometer store after reset:', e);
          });
        }
      })
      .catch((e) => {
        console.warn('Failed to restart DB-backed stores after reset:', e);
      });
  }
}
