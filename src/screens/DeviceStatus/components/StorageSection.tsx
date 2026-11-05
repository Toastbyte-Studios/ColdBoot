import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import {
  useCoreStore,
  useNotesStore,
  useOfflineMapLibraryStore,
} from '../../../stores/StoreContext';
import formatBytes from '../../../utils/formatBytes';
import {
  freeSpaceTone,
  mapAreasThatFit,
  measurePhotos,
  measureRecordings,
  StorageUsage,
} from '../appStorage';
import StatusRow from './StatusRow';
import StatusSection from './StatusSection';

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * Storage: free space on the device, what ColdBoot itself is holding (offline
 * maps, voice logs, photos), and roughly how many more map areas would fit.
 */
const StorageSection = observer(() => {
  const core = useCoreStore();
  const notes = useNotesStore();
  const maps = useOfflineMapLibraryStore();
  const [photos, setPhotos] = useState<StorageUsage | null>(null);
  const [recordings, setRecordings] = useState<StorageUsage | null>(null);

  // The map library loads when the Map opens; load it here if it hasn't.
  useEffect(() => {
    if (!maps.hasLoaded && !maps.loading) {
      maps.load().catch(() => {
        // A failed load just leaves the maps row at zero.
      });
    }
  }, [maps]);

  const audioUris = useMemo(
    () =>
      notes.notes
        .map((note) => note.audioUri)
        .filter((uri): uri is string => !!uri),
    [notes.notes],
  );
  const audioKey = audioUris.join('|');

  useEffect(() => {
    let cancelled = false;
    measurePhotos().then((usage) => !cancelled && setPhotos(usage));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    measureRecordings(audioUris).then(
      (usage) => !cancelled && setRecordings(usage),
    );
    return () => {
      cancelled = true;
    };
    // audioKey stands in for audioUris, which is a new array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioKey]);

  const free = core.storageFree;
  const total = core.storageTotal;
  const mapCount = maps.packs.length;
  const fit = mapAreasThatFit(free, maps.totalBytes, mapCount);

  return (
    <StatusSection title="Storage">
      <StatusRow
        label="Free space"
        value={free == null ? 'Unknown' : formatBytes(free)}
        detail={total == null ? undefined : `of ${formatBytes(total)}`}
        tone={freeSpaceTone(free)}
      />
      <StatusRow
        label="Offline maps"
        value={maps.hasLoaded ? formatBytes(maps.totalBytes) : '…'}
        detail={maps.hasLoaded ? plural(mapCount, 'area') : undefined}
      />
      <StatusRow
        label="Voice logs"
        value={recordings ? formatBytes(recordings.bytes) : '…'}
        detail={recordings ? plural(recordings.count, 'recording') : undefined}
      />
      <StatusRow
        label="Photos"
        value={photos ? formatBytes(photos.bytes) : '…'}
        detail={photos ? plural(photos.count, 'photo') : undefined}
      />
      <StatusRow
        label="Room for maps"
        value={
          !maps.hasLoaded
            ? '…'
            : mapCount === 0
              ? 'No areas yet'
              : fit == null
                ? 'Unknown'
                : `About ${plural(fit, 'more area', 'more areas')}`
        }
        detail={
          fit == null ? undefined : 'Judged by the areas you have downloaded'
        }
        isLast
      />
    </StatusSection>
  );
});

export default StorageSection;
