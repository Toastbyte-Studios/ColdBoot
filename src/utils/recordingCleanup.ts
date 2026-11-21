import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { isRecordingFileName } from './noteAttachments';

/**
 * Set once the sweep has run cleanly. Bump the suffix to run it again in a
 * later release.
 */
export const RECORDING_CLEANUP_KEY = 'maintenance.orphanedRecordings.v1';

/**
 * A recording touched within this long is left alone, whatever else is true:
 * it may belong to a recording or a restore still under way.
 */
export const RECORDING_CLEANUP_MIN_AGE_MS = 60 * 60 * 1000;

export type RecordingCleanupResult = {
  /** Files deleted. */
  deleted: number;
  /** Their total size, in bytes. */
  bytes: number;
  /** Orphans that could not be deleted; the sweep runs again next launch. */
  failed: number;
};

type Options = {
  /**
   * File names (not paths) of every recording a note points at. File names,
   * because iOS can move the app's container between versions while the
   * stored URIs keep the old path.
   */
  referencedFileNames: ReadonlySet<string>;
  /** Paths to keep regardless: a recording waiting to be recovered. */
  keepPaths?: ReadonlySet<string>;
  /** For tests. @default Date.now() */
  now?: number;
};

/** The last path segment, whether given a path or a `file://` URI. */
export function fileNameOf(uriOrPath: string): string {
  return uriOrPath.slice(uriOrPath.lastIndexOf('/') + 1);
}

/**
 * Deletes recordings that no note points at, once.
 *
 * Earlier builds recorded to the recorder library's default file
 * (`sound_<timestamp>.m4a`, `.mp4` on Android) and copied it to a
 * `voice-log_<uuid>` file for the note, leaving the original behind, and
 * deleting a note left its recording on disk (fixed in #491). Both live in
 * the Documents directory (`filesDir` on Android).
 *
 * Only recording file names (`isRecordingFileName`) directly in Documents
 * are considered, never anything in a subfolder, and never a file:
 * - a note points at,
 * - in `keepPaths`, or
 * - changed within the last hour.
 *
 * @returns What was deleted, or `null` when the sweep has already run.
 */
export async function cleanUpOrphanedRecordings({
  referencedFileNames,
  keepPaths = new Set(),
  now = Date.now(),
}: Options): Promise<RecordingCleanupResult | null> {
  if (await AsyncStorage.getItem(RECORDING_CLEANUP_KEY)) return null;

  const entries = await RNFS.readDir(RNFS.DocumentDirectoryPath);
  const orphans = entries.filter((entry) => {
    if (!entry.isFile() || !isRecordingFileName(entry.name)) return false;
    if (referencedFileNames.has(entry.name)) return false;
    if (keepPaths.has(entry.path)) return false;
    const modified = entry.mtime ? new Date(entry.mtime).getTime() : NaN;
    // An unknown age counts as recent.
    return isFinite(modified) && now - modified >= RECORDING_CLEANUP_MIN_AGE_MS;
  });

  const result: RecordingCleanupResult = { deleted: 0, bytes: 0, failed: 0 };
  for (const entry of orphans) {
    try {
      await RNFS.unlink(entry.path);
      result.deleted += 1;
      result.bytes += Number(entry.size ?? 0);
    } catch (error) {
      console.warn(
        'Could not delete an orphaned recording:',
        entry.name,
        error,
      );
      result.failed += 1;
    }
  }

  const hasDeferredRecordings = entries.some((entry) => {
    if (
      !entry.isFile() ||
      !isRecordingFileName(entry.name) ||
      referencedFileNames.has(entry.name) ||
      keepPaths.has(entry.path)
    ) {
      return false;
    }
    const modified = entry.mtime ? new Date(entry.mtime).getTime() : NaN;
    return isFinite(modified) && now - modified < RECORDING_CLEANUP_MIN_AGE_MS;
  });
  if (result.failed === 0 && !hasDeferredRecordings) {
    await AsyncStorage.setItem(
      RECORDING_CLEANUP_KEY,
      new Date(now).toISOString(),
    );
  }
  return result;
}
