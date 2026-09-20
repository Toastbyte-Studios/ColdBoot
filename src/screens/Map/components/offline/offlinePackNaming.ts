import {
  OfflineMapService,
  type OfflineMapPackMetadata,
} from '../../../../navigation/services/OfflineMapService';
import {
  buildOfflineAreaFallbackName,
  reverseGeocode,
} from '../../../../utils/reverseGeocode';
import type { OfflinePack } from '@maplibre/maplibre-react-native';

export async function buildOfflineMapPackMetadata(args: {
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  createdAt?: Date;
}): Promise<OfflineMapPackMetadata> {
  const createdAt = args.createdAt ?? new Date();
  const metadata: OfflineMapPackMetadata = {
    name: buildOfflineAreaFallbackName(createdAt),
    createdAt: createdAt.toISOString(),
    radiusMiles: args.radiusMiles,
    centerLng: args.centerLng,
    centerLat: args.centerLat,
  };
  const geocodeResult = await reverseGeocode(args.centerLat, args.centerLng, {
    timeoutMs: 2_500,
  });
  const areaName = geocodeResult?.areaName?.trim();
  if (areaName) {
    metadata.name = `Near ${areaName}`;
  }
  return metadata;
}

export async function createOfflineRegionWithSmartName(args: {
  bounds: [west: number, south: number, east: number, north: number];
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  zoomRange: { min: number; max: number };
  onProgress?: Parameters<
    typeof OfflineMapService.downloadRegion
  >[0]['onProgress'];
  onError?: Parameters<typeof OfflineMapService.downloadRegion>[0]['onError'];
}): Promise<OfflinePack> {
  const metadata = await buildOfflineMapPackMetadata({
    centerLat: args.centerLat,
    centerLng: args.centerLng,
    radiusMiles: args.radiusMiles,
  });
  return OfflineMapService.downloadRegion({
    bounds: args.bounds,
    metadata,
    zoomRange: args.zoomRange,
    onProgress: args.onProgress,
    onError: args.onError,
  });
}
