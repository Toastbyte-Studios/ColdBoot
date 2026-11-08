import { distanceMiles } from './distanceMiles';
import type { PackRegion } from './offlinePacks';

export type CoverageArea = { name: string; region: PackRegion | null };

/**
 * The first downloaded map area whose circle (the centre and radius it was
 * downloaded with, which is what the Map draws) contains the point, or null.
 * Areas whose region can't be read are skipped.
 */
export function findCoveringArea<T extends CoverageArea>(
  point: { latitude: number; longitude: number },
  areas: readonly T[],
): T | null {
  return (
    areas.find(
      (area) =>
        area.region !== null &&
        distanceMiles(
          point.latitude,
          point.longitude,
          area.region.center.latitude,
          area.region.center.longitude,
        ) <= area.region.radiusMiles,
    ) ?? null
  );
}
