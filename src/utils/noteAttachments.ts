import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import type { Note } from '../stores/NotesStore';

/** Every file a note owns: its photos and, for a voice log, its recording. */
export function attachmentUris(
  note: Pick<Note, 'photoUris' | 'audioUri'>,
): string[] {
  const uris = [...(note.photoUris ?? [])];
  if (note.audioUri) {
    uris.push(note.audioUri);
  }
  return uris;
}

/**
 * Where an attachment lives in this install's own storage, or `null` when
 * the URI points anywhere else.
 *
 * Photos (`utils/photoPicker`) and recordings (the recorder's default) are
 * both written to the app's documents directory. Only files there are ever
 * deleted: a URI that fell back to the picker's temporary file, or anything
 * a restored backup might name, is left alone.
 *
 * Notes store absolute paths, and on iOS the container part of that path can
 * differ from the current one after an update or reinstall. On iOS a path
 * whose last folder is `Documents` is therefore matched by file name.
 */
export function resolveOwnedAttachmentPath(uri: string): string | null {
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  const documents = RNFS.DocumentDirectoryPath;
  const slash = path.lastIndexOf('/');
  const directory = path.slice(0, slash);
  const fileName = path.slice(slash + 1);
  if (!fileName || fileName === '.' || fileName === '..') {
    return null;
  }
  const otherContainer =
    Platform.OS === 'ios' && directory.endsWith('/Documents');
  if (directory === documents || otherContainer) {
    return `${documents}/${fileName}`;
  }
  return null;
}

/**
 * Deletes attachment files from the app's storage. URIs outside it are
 * skipped, and a file that is already gone is not an error: the aim is that
 * nothing the user deleted is left behind, not to report on the filesystem.
 */
export async function deleteAttachmentFiles(uris: string[]): Promise<void> {
  const paths = new Set<string>();
  for (const uri of uris) {
    const path = resolveOwnedAttachmentPath(uri);
    if (path) {
      paths.add(path);
    }
  }
  await Promise.all(
    [...paths].map((path) => RNFS.unlink(path).catch(() => undefined)),
  );
}
