import { useEffect } from 'react';
import { LOCATION_PERMISSION_DENIED } from '../../stores/CoreStore';
import {
  useCoreStore,
  useEmergencyPlanStore,
  useOfflineMapLibraryStore,
  useSettingsStore,
} from '../../stores/StoreContext';
import { getValidRegionMetadata } from '../../utils/offlinePacks';
import { ReadinessItem, readinessItems } from './readiness';

/**
 * The off-grid readiness checklist, from the live stores. Shared by Device
 * Status' readiness section and Core's hero, so the two always agree.
 *
 * Call it from an `observer` component: it reads MobX state. It also loads
 * the offline map library if the Map hasn't yet, so the map item can resolve.
 */
export function useReadinessItems(): ReadinessItem[] {
  const core = useCoreStore();
  const maps = useOfflineMapLibraryStore();
  const settings = useSettingsStore();
  const plan = useEmergencyPlanStore();

  useEffect(() => {
    if (!maps.hasLoaded && !maps.loading) {
      maps.load().catch(() => {
        // Left as "Checking…" rather than claiming there are no maps.
      });
    }
  }, [maps]);

  const fix = core.lastFix?.coords ?? null;
  return readinessItems({
    fix: fix ? { latitude: fix.latitude, longitude: fix.longitude } : null,
    locationDenied: core.locationError === LOCATION_PERMISSION_DENIED,
    mapsLoaded: maps.hasLoaded && !maps.loadFailed,
    mapsLoadFailed: maps.loadFailed,
    packs: maps.packs
      .filter((pack) => pack.status?.state === 'complete')
      .map((pack) => ({
        name: maps.displayName(pack),
        region: getValidRegionMetadata(pack),
      })),
    lastBackupAt: settings.lastBackupAt,
    plan: {
      contacts: plan.contacts.length,
      rallyPoints: plan.rallyPoints.length,
      hasCommsPlan:
        plan.communicationPlan.updatedAt > 0 &&
        [
          plan.communicationPlan.whoCallsWhom,
          plan.communicationPlan.ifPhonesDown,
          plan.communicationPlan.outOfAreaContact,
          plan.communicationPlan.checkInSchedule,
        ].some((value) => value.trim().length > 0),
    },
  });
}
