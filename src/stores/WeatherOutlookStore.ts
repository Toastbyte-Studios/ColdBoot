import {
  IReactionDisposer,
  makeAutoObservable,
  reaction,
  runInAction,
} from 'mobx';
import { AppState, AppStateStatus } from 'react-native';
import {
  fetchSeasonalData,
  getCachedOutlook,
  initCacheTable,
  saveOutlookToCache,
  SeasonalOutlook,
  shouldRefresh,
} from '../services/weatherOutlookService';
import { SQLiteDatabase } from '../types/database-types';
import type { CoreStore } from './CoreStore';

const LOCATION_CHANGE_THRESHOLD_DEGREES = 0.5;

/**
 * MobX store for the seasonal weather outlook feature.
 *
 * Manages fetching, caching, and exposing SEAS5 ensemble forecast data from
 * the Open-Meteo Seasonal Forecast API.  Data is cached in the shared SQLite
 * database and keyed by (lat_1dp, lon_1dp, fetch_month) so nearby locations
 * within the same calendar month share a single cache row.
 *
 * Lifecycle:
 *  - Call `initDatabase(db)` once (from RootStore) to set up the cache table.
 *  - Call `start(core)` after the shared database is ready.
 *  - Call `stop()` on app unmount / store reset.
 */
export class WeatherOutlookStore {
  /** The currently loaded seasonal outlook, or null if not yet fetched. */
  outlook: SeasonalOutlook | null = null;
  /** True while an API request is in flight. */
  isLoading: boolean = false;
  /** Error message from the last failed fetch, or null. */
  error: string | null = null;
  /**
   * True when the displayed data came from cache but a refresh attempt was
   * made and failed (i.e. we are offline).  Shows a "last updated" notice.
   */
  isStale: boolean = false;

  private db: SQLiteDatabase | null = null;
  private _coreLastFixDisposer: IReactionDisposer | null = null;
  private _appStateSubscription: { remove: () => void } | null = null;
  private _lastAttemptedLocation: {
    latitude: number;
    longitude: number;
  } | null = null;
  private _pendingRefresh: {
    fix: CoreStore['lastFix'];
    forceRefresh: boolean;
  } | null = null;

  constructor() {
    makeAutoObservable(
      this,
      {
        _coreLastFixDisposer: false,
        _appStateSubscription: false,
        _lastAttemptedLocation: false,
        _pendingRefresh: false,
      } as never,
      { autoBind: true },
    );
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize the SQLite cache table.
   * Should be called once on app start after the database is ready.
   *
   * @param db - The shared SQLite database connection
   */
  async initDatabase(db: SQLiteDatabase): Promise<void> {
    this.db = db;
    try {
      await initCacheTable(db);
    } catch (e) {
      console.warn('WeatherOutlookStore: failed to init cache table', e);
    }
  }

  start(core: CoreStore): void {
    this.stop();
    this._refreshForFix(core.lastFix).catch(() => undefined);
    this._coreLastFixDisposer = reaction(
      () => core.lastFix,
      (lastFix) => {
        this._refreshForFix(lastFix, true).catch(() => undefined);
      },
    );
    this._appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          this._refreshForFix(core.lastFix).catch(() => undefined);
        }
      },
    );
  }

  stop(): void {
    this._coreLastFixDisposer?.();
    this._coreLastFixDisposer = null;
    this._appStateSubscription?.remove();
    this._appStateSubscription = null;
    this._lastAttemptedLocation = null;
    this._pendingRefresh = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Loads the seasonal outlook for the given coordinates.
   *
   * Strategy:
   * 1. If a cached entry exists and is < 30 days old → use it, skip network.
   * 2. If no cache or cache is stale → fetch from API and update cache.
   * 3. On network failure with stale / no cache → surface cached data with
   *    `isStale = true`; surface an error when there is nothing to show.
   *
   * @param lat - Device latitude
   * @param lon - Device longitude
   */
  async loadOutlook(lat: number, lon: number): Promise<boolean> {
    if (this.isLoading) {
      return false;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    // 1. Try cache
    const cached = this.db ? await getCachedOutlook(this.db, lat, lon) : null;

    if (cached && !shouldRefresh(cached.fetchedAt)) {
      runInAction(() => {
        this.outlook = cached;
        this.isStale = false;
        this.isLoading = false;
      });
      return true;
    }

    // 2. Attempt network fetch
    try {
      const fresh = await fetchSeasonalData(lat, lon);
      if (this.db) {
        await saveOutlookToCache(this.db, fresh);
      }
      runInAction(() => {
        this.outlook = fresh;
        this.isStale = false;
        this.isLoading = false;
      });
      return true;
    } catch (err) {
      // 3. Degrade gracefully
      const msg =
        err instanceof Error ? err.message : 'Failed to load weather outlook';
      runInAction(() => {
        if (cached) {
          this.outlook = cached;
          this.isStale = true;
          this.error = null;
        } else {
          this.outlook = null;
          this.isStale = false;
          this.error = msg;
        }
        this.isLoading = false;
      });
      return Boolean(cached);
    }
  }

  private async _refreshForFix(
    lastFix: CoreStore['lastFix'],
    requireMeaningfulMove: boolean = false,
  ): Promise<void> {
    if (!lastFix) {
      return;
    }

    if (this.isLoading) {
      this._pendingRefresh = {
        fix: lastFix,
        forceRefresh:
          Boolean(this._pendingRefresh?.forceRefresh) || !requireMeaningfulMove,
      };
      return;
    }

    const { latitude, longitude } = lastFix.coords;
    if (
      requireMeaningfulMove &&
      this._lastAttemptedLocation &&
      Math.abs(latitude - this._lastAttemptedLocation.latitude) <=
        LOCATION_CHANGE_THRESHOLD_DEGREES &&
      Math.abs(longitude - this._lastAttemptedLocation.longitude) <=
        LOCATION_CHANGE_THRESHOLD_DEGREES
    ) {
      return;
    }

    this._lastAttemptedLocation = { latitude, longitude };
    await this.loadOutlook(latitude, longitude);

    const pendingRefresh = this._pendingRefresh;
    this._pendingRefresh = null;
    if (pendingRefresh) {
      await this._refreshForFix(
        pendingRefresh.fix,
        !pendingRefresh.forceRefresh,
      );
    }
  }

  /**
   * Returns a brief, human-readable summary of the current month's outlook,
   * suitable for the footer notification rotation.
   * Returns null when no data is available.
   */
  getCurrentMonthSummary(): string | null {
    if (!this.outlook || this.outlook.months.length === 0) {
      return null;
    }
    const first = this.outlook.months[0];
    const precip = first.precipMm;
    const precipDesc = precip > 100 ? 'wet' : precip > 40 ? 'average' : 'dry';
    const tempAvgC = first.tempMeanC;
    const tempDesc = tempAvgC > 20 ? 'warm' : tempAvgC > 10 ? 'mild' : 'cold';
    return `This month: ${tempDesc} & ${precipDesc}`;
  }

  // ---------------------------------------------------------------------------
  // Dispose
  // ---------------------------------------------------------------------------

  /** Resets store state. */
  dispose(): void {
    this.stop();
    this.outlook = null;
    this.isLoading = false;
    this.error = null;
    this.isStale = false;
    this.db = null;
  }
}
