import { makeAutoObservable, runInAction } from 'mobx';
import {
  DEFAULT_OFFLINE_ZOOM,
  HIGH_DETAIL_OFFLINE_ZOOM,
  OfflineMapService,
  type OfflineMapPack,
} from '../navigation/services/OfflineMapService';
import { boundsFromRadius } from '../navigation/utils/boundsFromRadius';
import {
  clearPackNameOverride,
  getPackDisplayName,
  loadPackNameOverrides,
  setPackNameOverride,
  transferPackNameOverride,
} from '../utils/offlinePackNames';
import { getValidRegionMetadata } from '../utils/offlinePacks';

export type RefreshPackResult = 'refreshed' | 'missing-region';

/**
 * The downloaded offline map areas, held alongside waypoints and tracks so
 * every part of the Map section reads the same list.
 *
 * Packs live in MapLibre's native offline database and their user-chosen
 * names in AsyncStorage; this store joins the two. Actions throw on failure
 * and leave the user-facing message to the caller.
 */
export class OfflineMapLibraryStore {
  packs: OfflineMapPack[] = [];
  nameOverrides: Record<string, string> = {};
  /** True until the first load settles, so lists can skip the empty state. */
  loading = false;
  hasLoaded = false;
  /** The pack a delete or refresh is running on. One at a time. */
  busyPackId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get totalBytes(): number {
    return this.packs.reduce(
      (sum, pack) => sum + (pack.status?.completedResourceSize ?? 0),
      0,
    );
  }

  get isBusy(): boolean {
    return this.busyPackId !== null;
  }

  displayName(pack: Pick<OfflineMapPack, 'id' | 'metadata'>): string {
    return getPackDisplayName(pack, this.nameOverrides);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    this.loading = true;
    try {
      const [packs, overrides] = await Promise.all([
        OfflineMapService.listPacks(),
        loadPackNameOverrides(),
      ]);
      runInAction(() => {
        this.packs = packs;
        this.nameOverrides = overrides;
      });
    } finally {
      runInAction(() => {
        this.loading = false;
        this.hasLoaded = true;
      });
    }
  }

  async deletePack(pack: OfflineMapPack): Promise<void> {
    await this.runBusy(pack.id, async () => {
      await OfflineMapService.deletePack(pack.id);
      await clearPackNameOverride(pack.id);
      await this.load();
    });
  }

  /**
   * Downloads the pack's area again and swaps the new copy in. The old pack
   * is deleted only after the new one downloads, so a failed refresh keeps
   * what the user already had.
   */
  async refreshPack(
    pack: OfflineMapPack,
    options: { highDetail: boolean },
  ): Promise<RefreshPackResult> {
    const region = getValidRegionMetadata(pack);
    if (!region) {
      return 'missing-region';
    }

    await this.runBusy(pack.id, async () => {
      const replacement = await OfflineMapService.downloadRegion({
        bounds: boundsFromRadius(region.center, region.radiusMiles),
        metadata: {
          name: pack.metadata.name,
          createdAt: new Date().toISOString(),
          centerLng: region.center.longitude,
          centerLat: region.center.latitude,
          radiusMiles: region.radiusMiles,
        },
        zoomRange: options.highDetail
          ? HIGH_DETAIL_OFFLINE_ZOOM
          : DEFAULT_OFFLINE_ZOOM,
      });

      await OfflineMapService.deletePack(pack.id);
      await transferPackNameOverride(pack.id, replacement.id);
      await this.load();
    });
    return 'refreshed';
  }

  /** Saves a new name; a blank or unchanged name is a no-op. */
  async renamePack(packId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    const pack = this.packs.find((p) => p.id === packId);
    if (!trimmed || (pack && trimmed === this.displayName(pack))) {
      return;
    }
    await setPackNameOverride(packId, trimmed);
    runInAction(() => {
      this.nameOverrides = { ...this.nameOverrides, [packId]: trimmed };
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async runBusy(
    packId: string,
    work: () => Promise<void>,
  ): Promise<void> {
    this.busyPackId = packId;
    try {
      await work();
    } finally {
      runInAction(() => {
        this.busyPackId = null;
      });
    }
  }
}
