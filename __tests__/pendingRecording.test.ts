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
} from '../src/screens/VoiceLog/pendingRecording';

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
  });

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

  it('rejects when the marker cannot be written', async () => {
    storage.setItem.mockRejectedValue(new Error('full'));
    await expect(
      markRecordingStarted({ path: '/a', startedAt: 1 }),
    ).rejects.toThrow('full');
  });

  it('does not replace an unresolved marker', async () => {
    await markRecordingStarted({ path: '/a', startedAt: 1 });
    await expect(
      markRecordingStarted({ path: '/b', startedAt: 2 }),
    ).rejects.toThrow('awaiting recovery');
    expect(JSON.parse(stored!)).toEqual({ path: '/a', startedAt: 1 });
  });

  it('serializes a conditional clear and a later write', async () => {
    stored = JSON.stringify({ path: '/a', startedAt: 1 });
    let finishRemove!: () => void;
    let removing!: () => void;
    const removingStarted = new Promise<void>((resolve) => {
      removing = resolve;
    });
    storage.removeItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          removing();
          finishRemove = () => {
            stored = null;
            resolve();
          };
        }),
    );
    const clear = clearPendingRecording('/a');
    await removingStarted;
    const write = markRecordingStarted({ path: '/b', startedAt: 2 });
    expect(storage.setItem).not.toHaveBeenCalled();
    finishRemove();
    await Promise.all([clear, write]);
    expect(JSON.parse(stored!)).toEqual({ path: '/b', startedAt: 2 });
  });

  it('serializes invalid-marker cleanup and a later write', async () => {
    stored = 'invalid';
    let finishRemove!: () => void;
    let removing!: () => void;
    const removingStarted = new Promise<void>((resolve) => {
      removing = resolve;
    });
    storage.removeItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          removing();
          finishRemove = () => {
            stored = null;
            resolve();
          };
        }),
    );
    const read = readPendingRecording();
    await removingStarted;
    const write = markRecordingStarted({ path: '/b', startedAt: 2 });
    expect(storage.setItem).not.toHaveBeenCalled();
    finishRemove();
    await Promise.all([read, write]);
    expect(JSON.parse(stored!)).toEqual({ path: '/b', startedAt: 2 });
  });

  it('keeps the queue usable after a storage failure', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('unavailable'));
    await expect(readPendingRecording()).rejects.toThrow('unavailable');
    await markRecordingStarted({ path: '/a', startedAt: 1 });
    expect(JSON.parse(stored!)).toEqual({ path: '/a', startedAt: 1 });
  });
});
