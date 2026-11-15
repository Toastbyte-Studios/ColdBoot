import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import type { Note } from '../stores/NotesStore';

const pendingAttachmentPaths = new Set<string>();

/** Every file a note owns: its photos and, for a voice log, its recording. */
export function attachmentUris(
  note: Pick<Note, 'photoUris' | 'audioUri'>,
): string[] {
  const uris = Array.isArray(note.photoUris) ? [...note.photoUris] : [];
  if (typeof note.audioUri === 'string' && note.audioUri) {
    uris.push(note.audioUri);
  }
  return uris;
}

/**
 * Where an attachment lives in this install's own storage, or `null` when
 * the URI points anywhere else.
 *
 * Only filenames produced by the app's photo picker and Voice Log are
 * accepted. A URI that fell back to the picker's temporary file, an imported
 * arbitrary path, or a backup JSON file is left alone.
 *
 * Notes store absolute paths, and on iOS the container part of that path can
 * differ from the current one after an update or reinstall. On iOS a path
 * whose last folder is `Documents` is therefore matched by file name.
 */
export function resolveOwnedAttachmentPath(uri: string): string | null {
  if (!isNoteAttachmentUri(uri)) {
    return null;
  }
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  const documents = RNFS.DocumentDirectoryPath;
  const slash = path.lastIndexOf('/');
  const directory = path.slice(0, slash);
  const fileName = path.slice(slash + 1);
  if (directory === documents) {
    return `${documents}/${fileName}`;
  }
  const otherContainer =
    Platform.OS === 'ios' &&
    /^\/var\/mobile\/Containers\/Data\/Application\/[^/]+\/Documents$/.test(
      directory,
    );
  return otherContainer ? `${documents}/${fileName}` : null;
}

/**
 * Whether a file URI names a file using one of ColdBoot's generated
 * attachment filename formats. Used to validate attachment references in
 * backups made on another device; it does not imply local file ownership.
 */
export function isNoteAttachmentUri(uri: string): boolean {
  if (!uri || uri.includes('?') || uri.includes('#')) {
    return false;
  }
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  if (!path.startsWith('/')) {
    return false;
  }
  const fileName = path.slice(path.lastIndexOf('/') + 1);
  return isOwnedAttachmentFileName(fileName);
}

function isOwnedAttachmentFileName(fileName: string): boolean {
  return (
    /^photo_\d+_[a-z0-9]{1,6}\.(?:jpg|jpeg|png|gif|webp|heic|heif)$/i.test(
      fileName,
    ) ||
    /^sound_\d+(?:\.\d+)?\.(?:m4a|mp4)$/i.test(fileName) ||
    /^voice-log_[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.(?:m4a|mp4|wav|aac|3gp)$/i.test(
      fileName,
    )
  );
}

/**
 * Deletes attachment files from the app's storage. URIs outside it are
 * skipped, and a file that is already gone is not an error. Other failures
 * remain queued for the next cleanup attempt and are reported to the caller.
 */
export async function deleteAttachmentFiles(uris: string[]): Promise<void> {
  const paths = new Set<string>();
  for (const uri of uris) {
    const path = resolveOwnedAttachmentPath(uri);
    if (path) {
      paths.add(path);
    }
  }
  const pathsToDelete = new Set([...pendingAttachmentPaths, ...paths]);
  const failures = await Promise.all(
    [...pathsToDelete].map(async (path) => {
      try {
        await RNFS.unlink(path);
        pendingAttachmentPaths.delete(path);
        return null;
      } catch (error) {
        if (isMissingFileError(error)) {
          pendingAttachmentPaths.delete(path);
          return null;
        }
        pendingAttachmentPaths.add(path);
        return { path, error };
      }
    }),
  );
  const failedPaths = failures.filter(
    (failure): failure is { path: string; error: unknown } => failure !== null,
  );
  if (failedPaths.length > 0) {
    const details = failedPaths
      .map(({ path, error }) => `${path}: ${String(error)}`)
      .join('; ');
    throw new Error(`Failed to delete note attachment file(s): ${details}`);
  }
}

function isMissingFileError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === 'ENOENT') {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return (
    /\bENOENT\b/.test(message) || /no such file or directory/i.test(message)
  );
}
