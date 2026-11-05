import RNFS from 'react-native-fs';

/** Bytes and file count for one kind of ColdBoot data. */
export type StorageUsage = { bytes: number; count: number };

/** Prefix `photoPicker` gives every photo it copies into app storage. */
const PHOTO_PREFIX = 'photo_';

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

/**
 * Photos attached to items and notes. `photoPicker` copies each one into the
 * documents directory as `photo_<timestamp>_<random>.<ext>`, so the prefix
 * finds them without touching anything else that lives there.
 */
export async function measurePhotos(): Promise<StorageUsage> {
  try {
    const entries = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(PHOTO_PREFIX))
      .reduce<StorageUsage>(
        (sum, entry) => ({
          bytes: sum.bytes + Number(entry.size ?? 0),
          count: sum.count + 1,
        }),
        { bytes: 0, count: 0 },
      );
  } catch {
    return { bytes: 0, count: 0 };
  }
}

/**
 * Voice log recordings, measured from the paths their notes hold. A recording
 * whose file has gone (cleared by the OS, or a restore from another device)
 * is skipped rather than counted.
 */
export async function measureRecordings(
  audioUris: string[],
): Promise<StorageUsage> {
  const sizes = await Promise.all(
    audioUris.map(async (uri) => {
      try {
        const stat = await RNFS.stat(stripFileScheme(uri));
        return Number(stat.size ?? 0);
      } catch {
        return null;
      }
    }),
  );
  return sizes.reduce<StorageUsage>(
    (sum, size) =>
      size == null ? sum : { bytes: sum.bytes + size, count: sum.count + 1 },
    { bytes: 0, count: 0 },
  );
}

/**
 * Roughly how many more map areas fit in `freeBytes`, judged by the areas
 * already downloaded. Null when there is nothing to judge by.
 *
 * A quarter of free space is held back: running a phone to zero storage
 * breaks photos, updates and the app's own database long before maps.
 */
export function mapAreasThatFit(
  freeBytes: number | null,
  mapBytes: number,
  mapCount: number,
): number | null {
  if (freeBytes == null || mapCount === 0 || mapBytes <= 0) return null;
  const average = mapBytes / mapCount;
  return Math.max(0, Math.floor((freeBytes * 0.75) / average));
}

/**
 * Free space as a band. Under 1 GB is where a map download can fail part-way
 * and the OS starts clearing caches; under 5 GB is worth knowing about before
 * downloading several areas.
 */
export function freeSpaceTone(
  freeBytes: number | null,
): 'good' | 'fair' | 'poor' | 'neutral' {
  if (freeBytes == null) return 'neutral';
  const GB = 1024 ** 3;
  if (freeBytes < GB) return 'poor';
  if (freeBytes < 5 * GB) return 'fair';
  return 'good';
}
