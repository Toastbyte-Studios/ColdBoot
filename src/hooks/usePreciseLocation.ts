import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useCoreStore } from '../stores/StoreContext';

/**
 * Keeps position fixes at full accuracy while the calling screen is in
 * front. Use it on a screen that shows the position itself (coordinates, a
 * grid reference, a distance from here). Screens that only need to know
 * roughly where the phone is should not: the app's routine poll is
 * deliberately low-power (see `CoreStore.retainPreciseGps`).
 *
 * Tied to focus, not mount, so a screen left underneath another one in the
 * stack stops asking.
 */
export function usePreciseLocation(): void {
  const core = useCoreStore();
  useFocusEffect(useCallback(() => core.retainPreciseGps(), [core]));
}
