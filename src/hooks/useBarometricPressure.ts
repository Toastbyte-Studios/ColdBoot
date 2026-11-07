import { useBarometerStore } from '../stores/StoreContext';

export type { PressureSample } from '../stores/BarometerStore';

export interface UseBarometricPressureResult {
  /** Current pressure reading in hPa, or null if unavailable */
  pressure: number | null;
  /** Whether the sensor is available on this device */
  available: boolean;
  /** True while Cold mode has the sensor switched off */
  paused: boolean;
  /** Whether a first reading is still being acquired */
  loading: boolean;
  /** Historical samples (up to 24 h) persisted across app sessions */
  history: import('../stores/BarometerStore').PressureSample[];
  /** Error message if something went wrong */
  error: string | null;
}

/**
 * Returns live barometric pressure data from BarometerStore.
 *
 * History is persisted to SQLite and loaded at app startup, so the trend
 * windows (1 h – 24 h) reflect real accumulated data even the first time
 * the user opens this screen.
 */
export function useBarometricPressure(): UseBarometricPressureResult {
  const store = useBarometerStore();
  return {
    pressure: store.currentPressure,
    available: store.available,
    paused: store.paused,
    loading: store.loading,
    history: store.history,
    error: store.error,
  };
}
