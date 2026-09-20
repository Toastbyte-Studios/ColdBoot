import { OfflineMapService } from '../src/navigation/services/OfflineMapService';
import {
  buildOfflineMapPackMetadata,
  createOfflineRegionWithSmartName,
} from '../src/screens/Map/components/offline/offlinePackNaming';
import { reverseGeocode } from '../src/utils/reverseGeocode';

jest.mock('../src/utils/reverseGeocode', () => ({
  ...jest.requireActual('../src/utils/reverseGeocode'),
  reverseGeocode: jest.fn(),
}));

jest.mock('../src/navigation/services/OfflineMapService', () => ({
  ...jest.requireActual('../src/navigation/services/OfflineMapService'),
  OfflineMapService: {
    ...jest.requireActual('../src/navigation/services/OfflineMapService')
      .OfflineMapService,
    downloadRegion: jest.fn().mockResolvedValue({ id: 'pack-1' }),
  },
}));

describe('offline map naming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses place-based names when reverse geocode succeeds', async () => {
    (reverseGeocode as jest.Mock).mockResolvedValue({
      compassName: 'Las Vegas, NV',
      areaName: 'Red Rock Canyon',
    });

    const metadata = await buildOfflineMapPackMetadata({
      centerLat: 36.17,
      centerLng: -115.13,
      radiusMiles: 50,
      createdAt: new Date('2026-09-20T00:00:00.000Z'),
    });

    expect(metadata.name).toBe('Near Red Rock Canyon');
  });

  it('falls back to date-based name and still creates a pack', async () => {
    (reverseGeocode as jest.Mock).mockResolvedValue(null);

    await createOfflineRegionWithSmartName({
      bounds: [-116, 35, -114, 37],
      centerLat: 36.17,
      centerLng: -115.13,
      radiusMiles: 50,
      zoomRange: { min: 8, max: 13 },
    });

    expect(OfflineMapService.downloadRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: expect.stringMatching(/^Area Download /),
        }),
      }),
    );
  });
});
