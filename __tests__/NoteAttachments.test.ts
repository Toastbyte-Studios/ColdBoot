/**
 * @format
 * Deleting a note deletes the files it owns.
 */

jest.mock('react-native-sqlite-storage', () => {
  // Return null to force in-memory storage mode
  return null;
});

import RNFS from 'react-native-fs';
import { Note, NotesStore } from '../src/stores/NotesStore';
import {
  attachmentUris,
  deleteAttachmentFiles,
  resolveOwnedAttachmentPath,
} from '../src/utils/noteAttachments';

const DOCS = '/tmp/documents';
const unlink = RNFS.unlink as jest.Mock;
const deletedPaths = () => unlink.mock.calls.map(([path]) => path).sort();

function note(id: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    createdAt: 1,
    category: 'General',
    type: 'text',
    photoUris: [],
    ...extra,
  };
}

beforeEach(() => {
  unlink.mockReset();
  unlink.mockResolvedValue(undefined);
});

describe('resolveOwnedAttachmentPath', () => {
  it('accepts files in the documents directory, with or without file://', () => {
    expect(resolveOwnedAttachmentPath(`file://${DOCS}/photo_1.jpg`)).toBe(
      `${DOCS}/photo_1.jpg`,
    );
    expect(resolveOwnedAttachmentPath(`${DOCS}/sound_1.m4a`)).toBe(
      `${DOCS}/sound_1.m4a`,
    );
  });

  it("maps another container's Documents folder to this one by file name", () => {
    expect(
      resolveOwnedAttachmentPath(
        'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/photo_1.jpg',
      ),
    ).toBe(`${DOCS}/photo_1.jpg`);
  });

  it('refuses anything outside the app documents directory', () => {
    for (const uri of [
      'file:///tmp/cache/picker/IMG_0001.jpg',
      'content://media/external/images/1',
      'ph://ABC-123',
      `${DOCS}/nested/photo_1.jpg`,
      `${DOCS}/`,
      `file://${DOCS}/..`,
      '',
    ]) {
      expect(resolveOwnedAttachmentPath(uri)).toBeNull();
    }
  });
});

describe('deleteAttachmentFiles', () => {
  it('deletes owned files once each and ignores the rest', async () => {
    await deleteAttachmentFiles([
      `file://${DOCS}/photo_1.jpg`,
      `${DOCS}/photo_1.jpg`,
      'file:///tmp/cache/picker/IMG_0001.jpg',
    ]);

    expect(deletedPaths()).toEqual([`${DOCS}/photo_1.jpg`]);
  });

  it('does not reject when a file is already gone', async () => {
    unlink.mockRejectedValue(new Error('ENOENT'));
    await expect(
      deleteAttachmentFiles([`${DOCS}/photo_1.jpg`]),
    ).resolves.toBeUndefined();
  });
});

describe('attachmentUris', () => {
  it('lists photos and the recording', () => {
    expect(
      attachmentUris(note('n', { photoUris: ['a', 'b'], audioUri: 'c' })),
    ).toEqual(['a', 'b', 'c']);
    expect(attachmentUris(note('n'))).toEqual([]);
  });
});

describe('NotesStore attachment cleanup', () => {
  let store: NotesStore;

  const photoA = `file://${DOCS}/photo_a.jpg`;
  const photoB = `file://${DOCS}/photo_b.jpg`;
  const audio = `${DOCS}/sound_1.m4a`;

  beforeEach(async () => {
    store = new NotesStore();
    await store.importNotesData(
      ['General'],
      [
        note('text-note', { photoUris: [photoA, photoB] }),
        note('voice-note', {
          type: 'voice',
          category: 'Voice Logs',
          audioUri: audio,
        }),
        note('plain-note'),
      ],
      'replace',
    );
    unlink.mockClear();
  });

  afterEach(() => {
    store.dispose();
  });

  it('deletes the photos of a deleted note', async () => {
    await store.deleteNote('text-note');

    expect(store.notes.map((n) => n.id)).toEqual(['voice-note', 'plain-note']);
    expect(deletedPaths()).toEqual([
      `${DOCS}/photo_a.jpg`,
      `${DOCS}/photo_b.jpg`,
    ]);
  });

  it('deletes the recording of a deleted voice log', async () => {
    await store.deleteNote('voice-note');

    expect(deletedPaths()).toEqual([audio]);
  });

  it('touches no files for a note without attachments or an unknown id', async () => {
    await store.deleteNote('plain-note');
    await store.deleteNote('no-such-note');

    expect(unlink).not.toHaveBeenCalled();
  });

  it('deletes a photo removed while editing, and keeps the ones that stay', async () => {
    await store.updateNoteContent('text-note', { photoUris: [photoB] });

    expect(deletedPaths()).toEqual([`${DOCS}/photo_a.jpg`]);
  });

  it('leaves photos alone when an edit does not change them', async () => {
    await store.updateNoteContent('text-note', { title: 'Renamed' });

    expect(unlink).not.toHaveBeenCalled();
  });

  it('keeps a file another note still points at', async () => {
    await store.importNotesData(
      ['General'],
      [note('copy', { photoUris: [photoA] })],
      'merge',
    );
    unlink.mockClear();

    await store.deleteNote('text-note');

    expect(deletedPaths()).toEqual([`${DOCS}/photo_b.jpg`]);
  });

  it('a replace restore deletes files the restored notes no longer use', async () => {
    await store.importNotesData(
      ['General'],
      [note('restored', { photoUris: [photoB] })],
      'replace',
    );

    expect(deletedPaths()).toEqual([`${DOCS}/photo_a.jpg`, audio].sort());
  });

  it('a merge restore deletes nothing', async () => {
    await store.importNotesData(['General'], [note('extra')], 'merge');

    expect(unlink).not.toHaveBeenCalled();
  });
});
