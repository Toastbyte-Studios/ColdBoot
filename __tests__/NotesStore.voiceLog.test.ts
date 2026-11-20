/**
 * @format
 * Tests for how NotesStore stores voice logs' extra fields.
 */

import { NotesStore } from '../src/stores/NotesStore';

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('react-native-geolocation-service');
jest.mock('../src/utils/locationPermission', () => ({
  requestForegroundLocationPermission: jest.fn(() => Promise.resolve('denied')),
}));

type Row = Record<string, unknown>;
/** Rows `SELECT * FROM notes` returns. */
let mockNoteRows: Row[] = [];
const mockExecuteSql = jest.fn((query: string, _params?: unknown[]) => {
  const rows = query.startsWith('SELECT * FROM notes') ? mockNoteRows : [];
  return Promise.resolve([
    {
      rows: {
        length: rows.length,
        item: (i: number) => rows[i],
        raw: () => rows,
      },
    },
  ]);
});

jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() =>
    Promise.resolve({
      executeSql: (query: string, params?: unknown[]) =>
        mockExecuteSql(query, params),
      close: jest.fn(() => Promise.resolve()),
    }),
  ),
  enablePromise: jest.fn(),
  DEBUG: jest.fn(),
}));

/** The values of the last note INSERT, keyed by column. */
const lastInsertedRow = (): Row => {
  const call = [...mockExecuteSql.mock.calls]
    .reverse()
    .find(([query]) => /^INSERT OR (REPLACE|IGNORE) INTO notes /.test(query));
  if (!call) throw new Error('no note INSERT');
  const columns = /\(([^)]*)\) VALUES/
    .exec(call[0])![1]
    .split(',')
    .map((c) => c.trim());
  const params = call[1] ?? [];
  expect(params).toHaveLength(columns.length);
  return Object.fromEntries(columns.map((c, i) => [c, params[i]]));
};

const voiceRow = (overrides: Row = {}): Row => ({
  id: 'v1',
  createdAt: 1,
  latitude: null,
  longitude: null,
  category: 'Voice Logs',
  type: 'voice',
  title: 'Voice Log – 10:42',
  text: null,
  bookmarked: 0,
  sketchDataUri: null,
  photoUris: '[]',
  audioUri: 'file:///v1.m4a',
  transcription: null,
  duration: 4,
  waveform: null,
  ...overrides,
});

describe('NotesStore voice logs', () => {
  let store: NotesStore;

  beforeEach(() => {
    mockExecuteSql.mockClear();
    mockNoteRows = [];
    store = new NotesStore();
  });

  describe('waveform', () => {
    it('saves the waveform with a new log, as whole numbers', async () => {
      const note = await store.createVoiceLog({
        audioUri: 'file:///a.m4a',
        duration: 2,
        waveform: [10.4, 50.6, 0],
      });
      expect(note.waveform).toEqual([10, 51, 0]);
      expect(lastInsertedRow().waveform).toBe('[10,51,0]');
    });

    it('stores null when there is no waveform', async () => {
      const note = await store.createVoiceLog({
        audioUri: 'file:///a.m4a',
        duration: 2,
      });
      expect(note.waveform).toBeUndefined();
      expect(lastInsertedRow().waveform).toBeNull();
    });

    it('reads a stored waveform back', async () => {
      mockNoteRows = [voiceRow({ waveform: '[3,40,75]' })];
      await store.loadNotes();
      expect(store.notes[0].waveform).toEqual([3, 40, 75]);
    });

    it.each([
      ['missing', null],
      ['not JSON', '[3,'],
      ['not a list', '{"a":1}'],
      ['empty', '[]'],
      ['a non-number in it', '[3,"x"]'],
    ])('reads a %s waveform as none, and keeps the log', async (_, value) => {
      mockNoteRows = [voiceRow({ waveform: value })];
      await store.loadNotes();
      expect(store.notes).toHaveLength(1);
      expect(store.notes[0].waveform).toBeUndefined();
    });

    it('writes the waveform when restoring a backup', async () => {
      await store.importNotesData(
        [],
        [
          {
            id: 'r1',
            createdAt: 1,
            category: 'Voice Logs',
            type: 'voice',
            photoUris: [],
            audioUri: 'file:///r1.m4a',
            waveform: [1, 2, 3],
          },
        ],
        'merge',
      );
      expect(lastInsertedRow()).toMatchObject({
        id: 'r1',
        waveform: '[1,2,3]',
      });
    });
  });

  describe('renameNote', () => {
    it('writes only the title, by id', async () => {
      mockNoteRows = [voiceRow()];
      await store.loadNotes();
      mockExecuteSql.mockClear();
      await store.renameNote('v1', 'Camp water source');
      expect(store.notes[0].title).toBe('Camp water source');
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE notes SET title = ? WHERE id = ?',
        ['Camp water source', 'v1'],
      );
      expect(
        mockExecuteSql.mock.calls.some(([q]) => q.startsWith('INSERT')),
      ).toBe(false);
    });

    it('does nothing for a log that is gone', async () => {
      await store.renameNote('missing', 'x');
      expect(
        mockExecuteSql.mock.calls.some(([q]) => q.startsWith('UPDATE')),
      ).toBe(false);
    });
  });
});
