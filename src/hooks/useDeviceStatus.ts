import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useCoreStore } from '../stores/StoreContext';
import formatBytes from '../utils/formatBytes';
import formatPercent from '../utils/formatPercent';

/**
 * Custom React hook that monitors and provides device status information.
 *
 * Starts and stops device status monitoring automatically on mount and unmount.
 * Returns formatted status strings and raw values for storage, battery, location, and network connectivity.
 *
 * @returns An object containing:
 * - `storageText`: Formatted string of used and total storage.
 * - `batteryText`: Formatted string of battery percentage, charging status, and estimated time remaining.
 * - `lastFixText`: Formatted string of last known location fix or error message.
 * - `offlineText`: Formatted string indicating online/offline status.
 * - `batteryLevel`: Raw battery level (0-1 or null).
 * - `isCharging`: Boolean indicating if device is charging.
 * - `batteryEstimateMinutes`: Estimated battery time remaining in minutes.
 * - `storageTotal`: Total storage in bytes.
 * - `storageFree`: Free storage in bytes.
 * - `lastFix`: Last known location fix object.
 * - `netInfo`: Network information object.
 *
 * @example
 * const {
 *   storageText,
 *   batteryText,
 *   lastFixText,
 *   offlineText,
 *   batteryLevel,
 *   isCharging,
 *   batteryEstimateMinutes,
 *   storageTotal,
 *   storageFree,
 *   lastFix,
 *   netInfo,
 * } = useDeviceStatus();
 */
export function useDeviceStatus() {
  const core = useCoreStore();

  // Device status monitoring is now started globally in StoreProvider,
  // so we don't need to start/stop it here anymore.
  // This ensures the battery estimate is available instantly when this screen loads.

  /**
   * A memoized string representing the device's storage usage.
   * Displays the used storage and total storage in human-readable format,
   * along with the percentage of storage used.
   * Returns 'Unknown' if storage information is unavailable.
   *
   * Example output: "12.3 GB / 64 GB (19%)"
   */
  const storageText = useMemo(() => {
    const total = core.storageTotal;
    const free = core.storageFree;
    if (total == null || free == null) return 'Unknown';
    const used = total - free;
    return `${formatBytes(used)} / ${formatBytes(total)} (${formatPercent(
      used,
      total,
    )})`;
  }, [core.storageTotal, core.storageFree]);

  /**
   * A memoized string describing the current battery status, including percentage,
   * charging state, and estimated time remaining. If battery level or estimate is unavailable,
   * displays appropriate fallback text.
   *
   * Example outputs:
   * - "85% (2 hours 15 minutes remaining)"
   * - "85% (Charging — 2 hours 15 minutes remaining)"
   * - "Unknown"
   * - "85% (Calculating…)"
   *
   * Dependencies:
   * - `core.batteryLevel`: Battery level as a float between 0 and 1.
   * - `core.batteryEstimateMinutes`: Estimated minutes remaining.
   * - `core.isCharging`: Whether the device is currently charging.
   */
  const batteryText = useMemo(() => {
    const level = core.batteryLevel;
    if (level == null) return 'Unknown';
    const pct = Math.round(level * 100);
    const minutes = core.batteryEstimateMinutes;

    const estimateStr = (() => {
      if (minutes == null) return 'Calculating…';
      const hrs = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      const hWord = hrs === 1 ? 'hour' : 'hours';
      const mWord = mins === 1 ? 'minute' : 'minutes';
      const parts = [];
      if (hrs > 0) parts.push(`${hrs} ${hWord}`);
      if (mins > 0 || hrs === 0) parts.push(`${mins} ${mWord}`);
      const rough = core.batteryEstimateMeasured ? '' : ', rough guide';
      return `${parts.join(' ')} remaining${rough}`;
    })();

    if (core.isCharging) return `${pct}% (Charging — ${estimateStr})`;
    return `${pct}% (${estimateStr})`;
  }, [
    core.batteryLevel,
    core.batteryEstimateMinutes,
    core.batteryEstimateMeasured,
    core.isCharging,
  ]);

  /**
   * A memoized string describing the last known device location fix or error status.
   *
   * - If a location fix exists, returns a formatted timestamp and coordinates.
   * - If an error exists, returns the error message.
   * - Otherwise, indicates that no fix is available yet.
   *
   * Depends on `core.lastFix` and `core.locationError`.
   */
  const lastFixText = useMemo(() => {
    const fix = core.lastFix;
    const err = core.locationError;
    if (fix?.timestamp) {
      const when = dayjs(fix.timestamp).format('YYYY-MM-DD HH:mm:ss');
      const { latitude, longitude } = fix.coords;
      return `${when}\n${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    return err ? `Error: ${err}` : 'No fix yet';
  }, [core.lastFix, core.locationError]);

  /**
   * Memoized string representing the device's network status.
   * Returns 'Online' if the device is connected, 'Offline' if not, and 'Unknown' if network information is unavailable.
   *
   * @remarks
   * Uses `core.netInfo` to determine connectivity status.
   */
  const offlineText = useMemo(() => {
    const n = core.netInfo;
    if (!n) return 'Unknown';
    return n.isConnected ? 'Online' : 'Offline';
  }, [core.netInfo]);

  return {
    storageText,
    batteryText,
    lastFixText,
    offlineText,

    // Expose raw values if the UI needs them later
    batteryLevel: core.batteryLevel,
    isCharging: core.isCharging,
    batteryEstimateMinutes: core.batteryEstimateMinutes,
    storageTotal: core.storageTotal,
    storageFree: core.storageFree,
    lastFix: core.lastFix,
    netInfo: core.netInfo,
  };
}
