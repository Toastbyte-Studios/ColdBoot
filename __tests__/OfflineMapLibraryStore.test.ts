import { OfflineMapService } from '../src/navigation/services/OfflineMapService';
import { OfflineMapLibraryStore } from '../src/stores/OfflineMapLibraryStore';
import {
  clearPackNameOverride,
  loadPackNameOverrides,
  setPackNameOverride,
  transferPackNameOverride,
} from '../src/utils/offlinePackNames';
import type { OfflineMapPack } from '../src/navigation/services/OfflineMapService';

jest.mock('../src/navigation/services/OfflineMapService', () => ({
  ...jest.requireActual('../src/navigation/services/OfflineMapService'),
  OfflineMapService: {
    // Real tile counting, so refreshes are checked against the cap.
    ...jest.requireActual('../src/navigation/services/OfflineMapService')
      .OfflineMapService,
    listPacks: jest.fn(),
    deletePack: jest.fn(),
    downloadRegion: jest.fn(),
  },
}));

jest.mock('../src/utils/offlinePackNames', () => ({
  ...jest.requireActual('../src/utils/offlinePackNames'),
  loadPackNameOverrides: jest.fn(),
  setPackNameOverride: jest.fn(),
  clearPackNameOverride: jest.fn(),
  transferPackNameOverride: jest.fn(),
}));

const MB = 1024 * 1024;

function makePack(overrides: Partial<OfflineMapPack> = {}): OfflineMapPack {
  return {
    id: 'pack-1',
    metadata: {
      name: 'Area Download 10/12/2026',
      createdAt: '2026-10-12T00:00:00.000Z',
      radiusMiles: 50,
      centerLat: 36.14,
      centerLng: -115.07,
    },
    status: {
      state: 'complete',
      completedResourceCount: 10,
      requiredResourceCount: 10,
      completedResourceSize: 40 * MB,
    },
    ...overrides,
  } as OfflineMapPack;
}

describe('OfflineMapLibraryStore', () => {
  let store: OfflineMapLibraryStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new OfflineMapLibraryStore();
    (loadPackNameOverrides as jest.Mock).mockResolvedValue({});
  });

  it('loads packs with their saved names and totals their size', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([
      makePack(),
      makePack({ id: 'pack-2' }),
    ]);
    (loadPackNameOverrides as jest.Mock).mockResolvedValue({
      'pack-1': 'Near Main Way',
    });

    expect(store.hasLoaded).toBe(false);
    await store.load();

    expect(store.hasLoaded).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.packs).toHaveLength(2);
    expect(store.totalBytes).toBe(80 * MB);
    expect(store.displayName(store.packs[0])).toBe('Near Main Way');
    expect(store.displayName(store.packs[1])).toBe('Area Download 10/12/2026');
  });

  it('marks itself loaded even when the native list fails', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockRejectedValue(
      new Error('native failure'),
    );

    await expect(store.load()).rejects.toThrow('native failure');
    expect(store.hasLoaded).toBe(true);
    expect(store.loading).toBe(false);
  });

  it('only commits the latest overlapping load and its loading state', async () => {
    let finishFirst: ((packs: OfflineMapPack[]) => void) | undefined;
    let finishSecond: ((packs: OfflineMapPack[]) => void) | undefined;
    (OfflineMapService.listPacks as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise<OfflineMapPack[]>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<OfflineMapPack[]>((resolve) => {
            finishSecond = resolve;
          }),
      );

    const firstLoad = store.load();
    const secondLoad = store.load();
    finishFirst?.([makePack({ id: 'stale-pack' })]);
    await firstLoad;

    expect(store.loading).toBe(true);
    expect(store.hasLoaded).toBe(false);
    expect(store.packs).toEqual([]);

    finishSecond?.([makePack({ id: 'latest-pack' })]);
    await secondLoad;

    expect(store.loading).toBe(false);
    expect(store.hasLoaded).toBe(true);
    expect(store.packs.map((pack) => pack.id)).toEqual(['latest-pack']);
  });

  it('deletes a pack, clears its name and reloads', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([]);

    await store.deletePack(makePack());

    expect(OfflineMapService.deletePack).toHaveBeenCalledWith('pack-1');
    expect(clearPackNameOverride).toHaveBeenCalledWith('pack-1');
    expect(store.packs).toEqual([]);
    expect(store.busyPackId).toBeNull();
  });

  it('clears the busy pack when a delete fails', async () => {
    (OfflineMapService.deletePack as jest.Mock).mockRejectedValue(
      new Error('delete failed'),
    );

    await expect(store.deletePack(makePack())).rejects.toThrow('delete failed');
    expect(store.busyPackId).toBeNull();
    expect(clearPackNameOverride).not.toHaveBeenCalled();
  });

  it('refreshes by downloading first, then swapping the old pack out', async () => {
    const calls: string[] = [];
    (OfflineMapService.downloadRegion as jest.Mock).mockImplementation(
      async () => {
        calls.push('download');
        return { id: 'pack-2' };
      },
    );
    (OfflineMapService.deletePack as jest.Mock).mockImplementation(async () => {
      calls.push('delete');
    });
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([
      makePack({ id: 'pack-2' }),
    ]);

    const result = await store.refreshPack(makePack(), { highDetail: false });

    expect(result).toBe('refreshed');
    expect(calls).toEqual(['download', 'delete']);
    expect(OfflineMapService.downloadRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        zoomRange: { min: 8, max: 13 },
        metadata: expect.objectContaining({
          name: 'Area Download 10/12/2026',
          radiusMiles: 50,
          centerLat: 36.14,
          centerLng: -115.07,
        }),
      }),
    );
    expect(transferPackNameOverride).toHaveBeenCalledWith('pack-1', 'pack-2');
    expect(store.packs.map((p) => p.id)).toEqual(['pack-2']);
  });

  describe('within the per-download tile cap', () => {
    beforeEach(() => {
      (OfflineMapService.downloadRegion as jest.Mock).mockResolvedValue({
        id: 'pack-2',
      });
      (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([]);
    });

    const packAt = (radiusMiles: number, centerLat = 36.14) => {
      const pack = makePack();
      pack.metadata = { ...pack.metadata, radiusMiles, centerLat };
      return pack;
    };

    it('keeps high detail where it fits', async () => {
      const result = await store.refreshPack(packAt(10), { highDetail: true });

      expect(result).toBe('refreshed');
      expect(OfflineMapService.downloadRegion).toHaveBeenCalledWith(
        expect.objectContaining({ zoomRange: { min: 8, max: 14 } }),
      );
    });

    it('drops to standard detail when high detail is over the cap', async () => {
      // 50 miles around Vegas: ~2,300 tiles standard, ~9,100 high detail.
      const result = await store.refreshPack(packAt(50), { highDetail: true });

      expect(result).toBe('refreshed');
      expect(OfflineMapService.downloadRegion).toHaveBeenCalledWith(
        expect.objectContaining({ zoomRange: { min: 8, max: 13 } }),
      );
    });

    it('refuses an area over the cap at any detail, keeping the old one', async () => {
      // 50 miles around Seattle is over the cap even at standard detail.
      const result = await store.refreshPack(packAt(50, 47.6), {
        highDetail: false,
      });

      expect(result).toBe('too-large');
      expect(OfflineMapService.downloadRegion).not.toHaveBeenCalled();
      expect(OfflineMapService.deletePack).not.toHaveBeenCalled();
      expect(store.busyPackId).toBeNull();
    });
  });

  it('keeps the original pack when the refresh download fails', async () => {
    (OfflineMapService.downloadRegion as jest.Mock).mockRejectedValue(
      new Error('offline'),
    );

    await expect(
      store.refreshPack(makePack(), { highDetail: false }),
    ).rejects.toThrow('offline');
    expect(OfflineMapService.deletePack).not.toHaveBeenCalled();
    expect(store.busyPackId).toBeNull();
  });

  it('keeps the saved name on the old pack when removing it fails', async () => {
    (OfflineMapService.downloadRegion as jest.Mock).mockResolvedValue({
      id: 'pack-2',
    });
    (OfflineMapService.deletePack as jest.Mock).mockRejectedValue(
      new Error('delete failed'),
    );

    await expect(
      store.refreshPack(makePack(), { highDetail: false }),
    ).rejects.toThrow('delete failed');
    expect(transferPackNameOverride).not.toHaveBeenCalled();
    expect(store.busyPackId).toBeNull();
  });

  it('reports a pack it cannot place on the map instead of refreshing it', async () => {
    const pack = makePack();
    pack.metadata.centerLat = Number.NaN;

    const result = await store.refreshPack(pack, { highDetail: false });

    expect(result).toBe('missing-region');
    expect(OfflineMapService.downloadRegion).not.toHaveBeenCalled();
    expect(store.busyPackId).toBeNull();
  });

  it('renames a pack and skips blank or unchanged names', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);
    await store.load();

    await store.renamePack('pack-1', '   ');
    await store.renamePack('pack-1', 'Area Download 10/12/2026');
    expect(setPackNameOverride).not.toHaveBeenCalled();

    await store.renamePack('pack-1', '  Near Main Way ');
    expect(setPackNameOverride).toHaveBeenCalledWith('pack-1', 'Near Main Way');
    expect(store.displayName(store.packs[0])).toBe('Near Main Way');
  });
});
