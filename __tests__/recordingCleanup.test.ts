/**
 * @format
 * Tests for the one-off sweep of recordings no note points at.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { isRecordingFileName } from '../src/utils/noteAttachments';
import {
  cleanUpOrphanedRecordings,
  fileNameOf,
  RECORDING_CLEANUP_KEY,
} from '../src/utils/recordingCleanup';

const NOW = Date.UTC(2026, 10, 20, 12);
const HOUR = 60 * 60 * 1000;
const DOCS = '/tmp/documents';
const UUID = '0b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

const file = (name: string, ageMs = 30 * 24 * HOUR, size = 1000) => ({
  name,
  path: `${DOCS}/${name}`,
  size,
  mtime: new Date(NOW - ageMs),
  isFile: () => true,
  isDirectory: () => false,
});

const storage = jest.mocked(AsyncStorage);
const fs = jest.mocked(RNFS);

beforeEach(() => {
  storage.getItem.mockReset().mockResolvedValue(null);
  storage.setItem.mockReset().mockResolvedValue(undefined);
  fs.unlink.mockReset().mockResolvedValue(undefined);
  fs.readDir.mockReset();
});

const deleted = () => fs.unlink.mock.calls.map(([path]) => fileNameOf(path));

describe('isRecordingFileName', () => {
  it.each([
    ['sound_1700000000000.m4a', true],
    ['sound_1700000000000.mp4', true],
    ['sound_1700000000000.5.m4a', true],
    [`voice-log_${UUID}.m4a`, true],
    [`voice-log_${UUID}.mp4`, true],
    ['photo_1700000000000_ab12.jpg', false],
    ['decibel-meter.m4a', false],
    ['coldboot.db', false],
    ['voice-log_not-a-uuid.m4a', false],
    ['sound_abc.m4a', false],
  ])('%s → %p', (name, expected) => {
    expect(isRecordingFileName(name)).toBe(expected);
  });
});

describe('cleanUpOrphanedRecordings', () => {
  it('deletes old recordings no note points at, and remembers it ran', async () => {
    fs.readDir.mockResolvedValue([
      file('sound_1700000000000.m4a', 30 * 24 * HOUR, 400),
      file(`voice-log_${UUID}.m4a`, 2 * HOUR, 600),
    ] as never);

    const result = await cleanUpOrphanedRecordings({
      referencedFileNames: new Set(),
      now: NOW,
    });

    expect(result).toEqual({ deleted: 2, bytes: 1000, failed: 0 });
    expect(deleted()).toEqual([
      'sound_1700000000000.m4a',
      `voice-log_${UUID}.m4a`,
    ]);
    expect(storage.setItem).toHaveBeenCalledWith(
      RECORDING_CLEANUP_KEY,
      new Date(NOW).toISOString(),
    );
  });

  it('never deletes a recording a note points at', async () => {
    fs.readDir.mockResolvedValue([
      file('sound_1700000000000.m4a'),
      file(`voice-log_${UUID}.m4a`),
    ] as never);
    await cleanUpOrphanedRecordings({
      referencedFileNames: new Set([
        'sound_1700000000000.m4a',
        `voice-log_${UUID}.m4a`,
      ]),
      now: NOW,
    });
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('keeps a recording waiting to be recovered', async () => {
    const pending = file(`voice-log_${UUID}.m4a`);
    fs.readDir.mockResolvedValue([pending] as never);
    await cleanUpOrphanedRecordings({
      referencedFileNames: new Set(),
      keepPaths: new Set([pending.path]),
      now: NOW,
    });
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('leaves anything touched in the last hour, or of unknown age', async () => {
    fs.readDir.mockResolvedValue([
      file('sound_1700000000001.m4a', HOUR - 1000),
      { ...file('sound_1700000000002.m4a'), mtime: undefined },
      file('sound_1700000000003.m4a', HOUR),
    ] as never);
    await cleanUpOrphanedRecordings({
      referencedFileNames: new Set(),
      now: NOW,
    });
    expect(deleted()).toEqual(['sound_1700000000003.m4a']);
  });

  it('only touches recording files, never folders or anything else', async () => {
    fs.readDir.mockResolvedValue([
      file('photo_1700000000000_ab12.jpg'),
      file('coldboot.db'),
      file('backup.json'),
      {
        ...file('sound_1700000000000.m4a'),
        isFile: () => false,
        isDirectory: () => true,
      },
    ] as never);
    const result = await cleanUpOrphanedRecordings({
      referencedFileNames: new Set(),
      now: NOW,
    });
    expect(fs.unlink).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0, bytes: 0, failed: 0 });
    // Nothing to do still counts as done.
    expect(storage.setItem).toHaveBeenCalled();
  });

  it('runs only once', async () => {
    storage.getItem.mockResolvedValue('2026-11-01T00:00:00.000Z');
    await expect(
      cleanUpOrphanedRecordings({ referencedFileNames: new Set(), now: NOW }),
    ).resolves.toBeNull();
    expect(fs.readDir).not.toHaveBeenCalled();
  });

  it('tries again next launch if a file could not be deleted', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    fs.readDir.mockResolvedValue([
      file('sound_1700000000000.m4a'),
      file('sound_1700000000001.m4a'),
    ] as never);
    fs.unlink
      .mockRejectedValueOnce(new Error('busy'))
      .mockResolvedValueOnce(undefined);
    const result = await cleanUpOrphanedRecordings({
      referencedFileNames: new Set(),
      now: NOW,
    });
    expect(result).toMatchObject({ deleted: 1, failed: 1 });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
