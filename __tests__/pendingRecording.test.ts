/**
 * @format
 * Tests for the Voice Log's in-progress recording marker.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPendingRecording,
  markRecordingStarted,
  newRecordingPath,
  readPendingRecording,
  readPendingRecordingStrict,
} from '../src/utils/pendingRecording';

const storage = jest.mocked(AsyncStorage);
let stored: string | null = null;

beforeEach(() => {
  stored = null;
  storage.getItem.mockReset().mockImplementation(async () => stored);
  storage.setItem.mockReset().mockImplementation(async (_k, value) => {
    stored = value;
  });
  storage.removeItem.mockReset().mockImplementation(async () => {
    stored = null;
  });
});

describe('pendingRecording', () => {
  it('names new recordings as voice logs in Documents', () => {
    const path = newRecordingPath();
    expect(path).toMatch(/^\/tmp\/documents\/voice-log_[0-9a-f-]+\.m4a$/);
    expect(newRecordingPath()).not.toBe(path);
  });

  it('round-trips the marker', async () => {
    await markRecordingStarted({ path: '/tmp/documents/a.m4a', startedAt: 5 });
    await expect(readPendingRecording()).resolves.toEqual({
      path: '/tmp/documents/a.m4a',
      startedAt: 5,
    });
  });

  it('has no marker by default', async () => {
    await expect(readPendingRecording()).resolves.toBeNull();
    await expect(readPendingRecordingStrict()).resolves.toBeNull();
  });

  it('reads a valid marker strictly', async () => {
    stored = JSON.stringify({ path: '/a.m4a', startedAt: 1 });
    await expect(readPendingRecordingStrict()).resolves.toEqual({
      path: '/a.m4a',
      startedAt: 1,
    });
  });

  it('propagates storage read failures without clearing the marker', async () => {
    storage.getItem.mockRejectedValue(new Error('storage unavailable'));
    await expect(readPendingRecordingStrict()).rejects.toThrow(
      'storage unavailable',
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it.each(['', 'not json', '{"path":""}', '{"path":"/a","startedAt":"x"}'])(
    'rejects an invalid marker without clearing it (%p)',
    async (raw) => {
      stored = raw;
      await expect(readPendingRecordingStrict()).rejects.toThrow();
      expect(storage.removeItem).not.toHaveBeenCalled();
      expect(stored).toBe(raw);
    },
  );

  it.each(['not json', '{"path":""}', '{"path":"/a","startedAt":"x"}'])(
    'drops an unreadable marker (%p)',
    async (raw) => {
      stored = raw;
      await expect(readPendingRecording()).resolves.toBeNull();
      expect(stored).toBeNull();
    },
  );

  it('only clears the marker for the same recording', async () => {
    await markRecordingStarted({ path: '/new.m4a', startedAt: 2 });
    await clearPendingRecording('/old.m4a');
    expect(stored).not.toBeNull();
    await clearPendingRecording('/new.m4a');
    expect(stored).toBeNull();
  });

  it('keeps recording when the marker cannot be written', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.setItem.mockRejectedValue(new Error('full'));
    await expect(
      markRecordingStarted({ path: '/a', startedAt: 1 }),
    ).resolves.toBeUndefined();
  });
});
