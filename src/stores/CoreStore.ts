import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';
import { makeAutoObservable, runInAction } from 'mobx';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';
import { readBatteryTemperature } from '../utils/batteryTemperature';
import { requestForegroundLocationPermission } from '../utils/locationPermission';

/** GPS poll interval normally, and in Cold mode. */
export const GPS_INTERVAL_MS = 60 * 1000;
export const COLD_MODE_GPS_INTERVAL_MS = 10 * 60 * 1000;

/** `locationError` when the user has not granted location access. */
export const LOCATION_PERMISSION_DENIED = 'Location permission not granted';
const LOCATION_PERMISSION_DENIED_CODE = 1;

export class CoreStore {
  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // --------------------------------------------------------------------
  // ===== Device Status =====
  // --------------------------------------------------------------------
  // Battery state
  batteryLevel: number | null = null;
  isCharging: boolean | null = null;
  /** iOS Low Power Mode / Android Battery Saver; null until first sampled. */
  lowPowerMode: boolean | null = null;
  /** Battery temperature in °C; Android only, null on iOS or until sampled. */
  batteryTemperatureC: number | null = null;
  batteryEstimateMinutes: number | null = null;
  private lastBatterySample: { level: number; at: number } | null = null;
  private batteryQuickIv: ReturnType<typeof setInterval> | null = null;
  private batterySlowIv: ReturnType<typeof setInterval> | null = null;
  private batteryQuickDeadline: number | null = null;

  // Storage state
  storageTotal: number | null = null;
  storageFree: number | null = null;

  // Connectivity
  netInfo: NetInfoState | null = null;
  private netUnsub: NetInfoSubscription | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private locationRequestedThisForeground = false;

  // GPS
  lastFix: GeoPosition | null = null;
  locationError: string | null = null;
  private gpsIv: ReturnType<typeof setInterval> | null = null;
  /** How often GPS is polled; Cold mode lengthens it. */
  gpsIntervalMs: number = GPS_INTERVAL_MS;
  /** How many screens currently need full-accuracy fixes. */
  private preciseGpsHolders = 0;

  /**
   * Sets a fallback battery estimate for charging devices.
   * If battery is at or near 100%, shows maximum runtime (8 hours).
   * Otherwise, shows estimated time to reach 100% (2 hours baseline).
   *
   * @private
   * @param level - Current battery level (0-1)
   */
  private setChargingFallbackEstimate(level: number): void {
    if (level >= 0.99) {
      // Battery is full or nearly full while charging
      // Show maximum runtime estimate (8 hours at 100%)
      this.batteryEstimateMinutes = 480;
    } else {
      // Baseline: 2 hours to charge from current level to 100%
      this.batteryEstimateMinutes = Math.round((1.0 - level) * 120);
    }
  }

  /**
   * Samples the current battery level and charging state using DeviceInfo.
   * Updates the store's battery level and charging status.
   * Provides instant fallback estimates on first sample for both charging and discharging.
   * If a previous battery sample exists, calculates more accurate estimates based on battery drain/charge rate.
   * Handles errors silently.
   *
   * @private
   * @returns {Promise<void>} Resolves when the sampling is complete.
   */
  private sampleBattery = async (): Promise<void> => {
    // Read on its own, so a failure reading the level or power state below
    // doesn't lose it. Never throws; null on iOS.
    const temperature = await readBatteryTemperature();
    runInAction(() => {
      this.batteryTemperatureC = temperature;
    });

    try {
      const level = await DeviceInfo.getBatteryLevel();
      const power = await DeviceInfo.getPowerState();
      const charging =
        power.batteryState === 'charging' ||
        power.batteryState === 'full' ||
        power.charging === true;
      runInAction(() => {
        this.batteryLevel = level;
        this.isCharging = charging;
        this.lowPowerMode =
          typeof power.lowPowerMode === 'boolean' ? power.lowPowerMode : null;
      });

      if (this.lastBatterySample) {
        const now = Date.now();
        const dtMin = (now - this.lastBatterySample.at) / 60000;
        const dLevel = this.lastBatterySample.level - level; // positive on drop
        if (dtMin > 0 && dLevel > 0 && !charging) {
          const ratePerMin = dLevel / dtMin;
          if (ratePerMin > 0) {
            const minutesLeft = level / ratePerMin;
            runInAction(() => {
              this.batteryEstimateMinutes = minutesLeft;
            });
          }
        } else if (dtMin > 0 && charging && dLevel < 0) {
          // Device is charging and battery is increasing
          const ratePerMin = Math.abs(dLevel) / dtMin;
          if (ratePerMin > 0) {
            const minutesToFull = (1.0 - level) / ratePerMin;
            runInAction(() => {
              this.batteryEstimateMinutes = minutesToFull;
            });
          }
        } else if (charging) {
          // Charging but no increase yet - provide instant fallback
          runInAction(() => {
            this.setChargingFallbackEstimate(level);
          });
        } else if (dLevel < 0) {
          // Battery increased but not charging - clear estimate
          runInAction(() => {
            this.batteryEstimateMinutes = null;
          });
        }
      } else {
        // First sample - provide instant fallback estimate
        if (charging) {
          runInAction(() => {
            this.setChargingFallbackEstimate(level);
          });
        } else if (level > 0) {
          // Baseline: 8 hours at 100% battery
          runInAction(() => {
            this.batteryEstimateMinutes = Math.round(level * 480);
          });
        }
      }
      runInAction(() => {
        this.lastBatterySample = { level, at: Date.now() };
      });
    } catch {
      // intentionally ignored: battery API may be unavailable on some devices
    }
  };

  /**
   * Starts the battery sampling process.
   *
   * - Immediately samples the battery.
   * - Initiates a quick sampling interval every 15 seconds for approximately 3 minutes.
   * - During quick sampling, checks if a battery estimate is available or if the quick sampling period has expired.
   * - If no estimate is available but battery level is known, sets a fallback estimate (8 hours at 100%).
   * - After quick sampling, clears intervals and switches to slow sampling every 60 seconds.
   *
   * @private
   */
  private startBatterySampling = () => {
    // Immediate sample
    this.sampleBattery();
    // Quick sampling for ~3 minutes
    this.batteryQuickDeadline = Date.now() + 3 * 60 * 1000;
    this.clearBatteryIntervals();
    this.batteryQuickIv = setInterval(() => {
      this.sampleBattery();
      const hasEstimate = this.batteryEstimateMinutes != null;
      const expired =
        this.batteryQuickDeadline != null &&
        Date.now() >= this.batteryQuickDeadline;
      if (hasEstimate || expired) {
        if (!hasEstimate && this.batteryLevel != null && !this.isCharging) {
          // Fallback baseline 8h at 100%
          runInAction(() => {
            this.batteryEstimateMinutes = Math.round(this.batteryLevel! * 480);
          });
        }
        this.clearBatteryIntervals();
        this.batterySlowIv = setInterval(this.sampleBattery, 60000);
      }
    }, 15000);
  };

  /**
   * Clears any active battery-related intervals and resets their references to null.
   *
   * This method checks if the quick and slow battery interval timers are set,
   * clears them if they exist, and then sets their references to null to prevent
   * further unintended usage.
   */
  private clearBatteryIntervals = () => {
    if (this.batteryQuickIv) clearInterval(this.batteryQuickIv);
    if (this.batterySlowIv) clearInterval(this.batterySlowIv);
    this.batteryQuickIv = null;
    this.batterySlowIv = null;
  };

  /**
   * Asynchronously refreshes the device's storage information.
   * Retrieves the total disk capacity and free disk storage using `DeviceInfo`,
   * and updates the `storageTotal` and `storageFree` properties.
   * If retrieval fails, the error is silently ignored.
   *
   * @returns {Promise<void>} Resolves when storage information has been updated.
   */
  private refreshStorage = async (): Promise<void> => {
    try {
      const [total, free] = await Promise.all([
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getFreeDiskStorage(),
      ]);
      runInAction(() => {
        this.storageTotal = total ?? null;
        this.storageFree = free ?? null;
      });
    } catch {
      // intentionally ignored: disk storage API may be unavailable on some devices
    }
  };

  /**
   * Starts a network information subscription if one is not already active.
   * Uses `NetInfo.addEventListener` to listen for network state changes and updates
   * the `netInfo` property with the latest state.
   * Ensures that only one subscription is active at a time by checking `netUnsub`.
   *
   * @private
   */
  private startNetSubscription = () => {
    if (this.netUnsub) return;
    this.netUnsub = NetInfo.addEventListener((state) => {
      runInAction(() => {
        this.netInfo = state;
      });
    });
  };

  /**
   * Stops the current network subscription by invoking the unsubscribe function if it exists,
   * and resets the subscription reference to null.
   *
   * @private
   */
  private stopNetSubscription = () => {
    if (this.netUnsub) this.netUnsub();
    this.netUnsub = null;
  };

  /**
   * Asks for full-accuracy fixes for as long as a screen that shows the
   * position itself is in front (Device Status, the Navigation module).
   * Returns the function that gives the request up; see `gpsGetFix` for
   * what the app does the rest of the time. Takes a precise fix at once so
   * the screen doesn't open on a coarse one.
   */
  retainPreciseGps(): () => void {
    this.preciseGpsHolders += 1;
    if (this.preciseGpsHolders === 1 && this.gpsIv) {
      this.gpsGetFix();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      runInAction(() => {
        this.preciseGpsHolders -= 1;
      });
    };
  }

  /**
   * Takes one position fix and stores it in `lastFix`.
   *
   * This runs on a timer for as long as the app is open, and nearly
   * everything that reads `lastFix` only needs to know roughly where the
   * phone is: sun and moon times, the hemisphere, the Seasonal Outlook, the
   * nearest repeater. So the routine poll asks for a low-power fix and
   * accepts one as old as the poll interval, which lets the OS answer from
   * what it already knows instead of powering the GPS receiver up every
   * minute. Full accuracy is used only while a screen has asked for it
   * through `retainPreciseGps`.
   *
   * A low-power request can fail where there is no cell or Wi-Fi signal to
   * place the phone by, which is exactly where this app is meant to work,
   * so a failed one is retried at full accuracy before an error is shown.
   */
  private gpsGetFix = () => {
    this.readPosition(this.preciseGpsHolders > 0);
  };

  private readPosition(precise: boolean): void {
    Geolocation.getCurrentPosition(
      (pos) => {
        runInAction(() => {
          this.lastFix = pos;
          this.locationError = null;
        });
      },
      (err) => {
        const denied = err.code === LOCATION_PERMISSION_DENIED_CODE;
        if (!precise && !denied) {
          this.readPosition(true);
          return;
        }
        runInAction(() => {
          this.locationError = denied
            ? LOCATION_PERMISSION_DENIED
            : err.message;
        });
      },
      precise
        ? { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        : {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: this.gpsIntervalMs,
          },
    );
  }

  /**
   * Starts polling for GPS location updates.
   *
   * Requests location authorization from the user. If permission is granted,
   * immediately fetches the current GPS fix and sets up a polling interval to
   * repeatedly fetch the GPS fix every 60 seconds. If permission is denied or
   * an error occurs during authorization, sets an appropriate location error message.
   *
   * @private
   * @returns {Promise<void>} Resolves when polling is started or an error is handled.
   */
  private async startGpsPolling(): Promise<void> {
    if (Platform.OS === 'android' && this.locationRequestedThisForeground) {
      const [fineGranted, coarseGranted] = await Promise.all([
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ),
      ]);
      if (!fineGranted && !coarseGranted) {
        return;
      }
    }
    if (Platform.OS === 'android') {
      this.locationRequestedThisForeground = true;
    }

    const auth = await requestForegroundLocationPermission();
    if (auth === 'granted') {
      runInAction(() => {
        this.locationError = null;
      });
      this.gpsGetFix();
      if (this.gpsIv) clearInterval(this.gpsIv);
      this.gpsIv = setInterval(() => this.gpsGetFix(), this.gpsIntervalMs);
    } else {
      runInAction(() => {
        this.locationError = LOCATION_PERMISSION_DENIED;
      });
    }
  }

  /**
   * Changes how often GPS is polled, re-timing a running poll. Going faster
   * also takes a fix straight away, so leaving Cold mode doesn't leave the
   * position up to ten minutes old.
   */
  setGpsIntervalMs(ms: number) {
    if (ms === this.gpsIntervalMs) return;
    const faster = ms < this.gpsIntervalMs;
    this.gpsIntervalMs = ms;
    if (!this.gpsIv) return;
    clearInterval(this.gpsIv);
    this.gpsIv = setInterval(() => this.gpsGetFix(), ms);
    if (faster) this.gpsGetFix();
  }

  /**
   * Stops the GPS polling interval if it is currently active.
   * Clears the interval and resets the interval reference to null.
   *
   * @private
   */
  private stopGpsPolling() {
    if (this.gpsIv) clearInterval(this.gpsIv);
    this.gpsIv = null;
  }

  private startAppStateSubscription = () => {
    if (this.appStateSub) return;
    this.appStateSub = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  };

  private stopAppStateSubscription = () => {
    this.appStateSub?.remove();
    this.appStateSub = null;
  };

  private handleAppStateChange = (nextState: AppStateStatus) => {
    const wasActive = this.appState === 'active';
    this.appState = nextState;
    if (!wasActive && nextState === 'active') {
      this.locationRequestedThisForeground = false;
      if (!this.gpsIv) {
        this.startGpsPolling();
      }
    }
  };

  /**
   * Initiates monitoring of device status by starting battery sampling,
   * refreshing storage information, subscribing to network status updates,
   * and polling GPS data.
   *
   * @remarks
   * This method aggregates multiple device status monitoring routines
   * to provide comprehensive device health and connectivity information.
   */
  startDeviceStatusMonitoring = () => {
    this.startBatterySampling();
    this.refreshStorage();
    this.startNetSubscription();
    this.startAppStateSubscription();
    this.startGpsPolling();
  };

  /**
   * Stops monitoring the device status by clearing battery intervals,
   * unsubscribing from network status updates, and stopping GPS polling.
   *
   * @remarks
   * This method should be called when device status monitoring is no longer needed,
   * such as during cleanup or when the application is paused.
   */
  stopDeviceStatusMonitoring = () => {
    this.clearBatteryIntervals();
    this.stopNetSubscription();
    this.stopGpsPolling();
    this.stopAppStateSubscription();
  };

  // --------------------------------------------------------------------
  // ==== Cleanup on store disposal ====
  // --------------------------------------------------------------------
  dispose() {
    this.stopDeviceStatusMonitoring();
  }
}
