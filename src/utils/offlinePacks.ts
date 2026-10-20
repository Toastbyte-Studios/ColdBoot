import type { OfflineMapPack } from '../navigation/services/OfflineMapService';

export type PackRegion = {
  center: { latitude: number; longitude: number };
  radiusMiles: number;
};

/**
 * Reads the centre and radius a pack was downloaded with. Returns null when
 * the stored metadata can't place the pack on the map, so callers can neither
 * fly to it nor download it again.
 */
export function getValidRegionMetadata(
  pack: Pick<OfflineMapPack, 'metadata'>,
): PackRegion | null {
  const { centerLng, centerLat, radiusMiles } = pack.metadata;
  const isValid =
    Number.isFinite(centerLng) &&
    centerLng >= -180 &&
    centerLng <= 180 &&
    Number.isFinite(centerLat) &&
    centerLat >= -90 &&
    centerLat <= 90 &&
    Number.isFinite(radiusMiles) &&
    radiusMiles > 0;

  if (!isValid) {
    return null;
  }

  return {
    center: { latitude: centerLat, longitude: centerLng },
    radiusMiles,
  };
}

/** Short "Oct 12" label for when a pack was downloaded. */
export function formatPackDownloadedDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Describes a pack that isn't fully downloaded ("downloading 40%",
 * "incomplete 80%", "failed"). Returns null for a complete pack, which needs
 * no status in its row.
 */
export function describePackStatus(pack: OfflineMapPack): string | null {
  const required = pack.status.requiredResourceCount ?? 0;
  const completed = pack.status.completedResourceCount ?? 0;

  if (pack.status.state === 'active') {
    const pct = required > 0 ? Math.round((completed / required) * 100) : 0;
    return `downloading ${pct}%`;
  }

  if (pack.status.state === 'complete') {
    return null;
  }

  if (required > 0 && completed < required) {
    const pct = Math.round((completed / required) * 100);
    return `incomplete ${pct}%`;
  }

  return 'failed';
}
