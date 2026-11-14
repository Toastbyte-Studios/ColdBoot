import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import ModuleHero from '../../components/ModuleHero';
import { usePreciseLocation } from '../../hooks/usePreciseLocation';
import { LOCATION_PERMISSION_DENIED } from '../../stores/CoreStore';
import {
  useCoreStore,
  useEmergencyPlanStore,
  useOfflineMapLibraryStore,
  useSettingsStore,
  useTrackStore,
  useWaypointStore,
} from '../../stores/StoreContext';
import { findCoveringArea } from '../../utils/offlineCoverage';
import { getValidRegionMetadata } from '../../utils/offlinePacks';
import {
  lastTrackText,
  nearestSafePoint,
  parseCoordinateText,
  positionHeadline,
  SafePoint,
} from './navigationHero';

/**
 * Navigation's hero: where you are, as a grid reference you could read out
 * over a radio, and how far to trust it. Below: the nearest rally point or
 * waypoint with distance and direction, whether an offline map covers you,
 * and your last recorded track.
 */
const NavigationHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useCoreStore();
  const settings = useSettingsStore();
  const maps = useOfflineMapLibraryStore();
  const waypoints = useWaypointStore();
  const tracks = useTrackStore();
  const plan = useEmergencyPlanStore();
  const [now, setNow] = useState(() => Date.now());

  // The fix's age is shown to the minute.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // The map library loads when the Map opens; load it here if it hasn't.
  useEffect(() => {
    if (!maps.hasLoaded && !maps.loading) {
      maps.load().catch(() => {
        // Coverage just reads as unknown.
      });
    }
  }, [maps]);

  // The hero shows where you are and how far the rally points are.
  usePreciseLocation();

  const system = settings.measurementSystem;
  const fix = core.lastFix;
  const here = fix
    ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude }
    : null;
  const position = positionHeadline(
    fix,
    core.locationError === LOCATION_PERMISSION_DENIED,
    system,
    now,
    core.gpsIntervalMs,
  );

  const safePoints: SafePoint[] = [
    ...plan.rallyPoints.flatMap((rally) => {
      const at = parseCoordinateText(rally.coordinates);
      return at
        ? [{ ...at, name: rally.name, kind: 'Rally point' as const }]
        : [];
    }),
    ...waypoints.waypoints.map((w) => ({
      latitude: w.latitude,
      longitude: w.longitude,
      name: w.name,
      kind: 'Waypoint' as const,
    })),
  ];
  const nearest = nearestSafePoint(here, safePoints, system);

  // Same rule as Device Status' readiness: only finished downloads count.
  const areas = maps.packs
    .filter((pack) => pack.status?.state === 'complete')
    .map((pack) => ({
      name: maps.displayName(pack),
      region: getValidRegionMetadata(pack),
    }));
  const coverage = maps.loadFailed
    ? { value: "Couldn't check", tone: 'muted' as const }
    : !maps.hasLoaded
      ? { value: '…', tone: 'muted' as const }
      : areas.length === 0
        ? { value: 'No areas', tone: 'poor' as const }
        : !here
          ? { value: 'Needs GPS', tone: 'muted' as const }
          : findCoveringArea(here, areas)
            ? { value: 'Covered', tone: 'good' as const }
            : { value: 'Not covered', tone: 'fair' as const };

  return (
    <ModuleHero
      eyebrow="Your position"
      headline={position.headline}
      headlineTone={position.tone}
      detail={position.detail}
      onPress={() => navigation.navigate('GridReference')}
      stats={[
        nearest
          ? {
              label: nearest.label,
              value: nearest.value,
              onPress: () =>
                navigation.navigate(
                  nearest.label === 'Rally point' ? 'RallyPoints' : 'MapScreen',
                ),
            }
          : {
              label: 'Rally point',
              value: here ? 'None with coordinates' : 'Needs GPS',
              tone: 'muted',
              onPress: () => navigation.navigate('RallyPoints'),
            },
        {
          label: 'Offline map',
          value: coverage.value,
          tone: coverage.tone,
          onPress: () => navigation.navigate('MapScreen', { library: 'maps' }),
        },
        {
          label: 'Last track',
          value: lastTrackText(tracks.tracks, system) ?? 'None yet',
          tone: tracks.tracks.length === 0 ? 'muted' : undefined,
          onPress: () => navigation.navigate('MapScreen'),
        },
      ]}
    />
  );
});

export default NavigationHero;
