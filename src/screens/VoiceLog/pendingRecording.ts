import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

/**
 * A marker for the recording in progress, so one cut off by the app closing
 * (a crash, the OS killing it) can be found on the next visit.
 *
 * Written before the recorder starts and removed once the recording is
 * saved or deleted. If it is still there when Voice Log opens, the
 * recording never finished. See `useRecordingRecovery`.
 */
const KEY = 'voiceLog.pendingRecording';
let operations: Promise<void> = Promise.resolve();
let activeRecording: Promise<void> | null = null;

export function beginActiveRecording(): () => void {
  if (activeRecording) throw new Error('A recording is already active');
  let finish!: () => void;
  const active = new Promise<void>((resolve) => {
    finish = resolve;
  });
  activeRecording = active;
  return () => {
    if (activeRecording === active) activeRecording = null;
    finish();
  };
}

export async function waitForActiveRecording(): Promise<boolean> {
  const active = activeRecording;
  if (!active) return false;
  await active;
  return true;
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

const PendingRecordingSchema = z.object({
  /** Plain absolute path in the Documents directory (no `file://`). */
  path: z.string().min(1),
  /** Epoch ms when recording started. */
  startedAt: z.number(),
});

export type PendingRecording = z.infer<typeof PendingRecordingSchema>;

/**
 * Where a new recording is written: straight into Documents, under a name
 * `utils/noteAttachments` recognises, so a file left behind by a crash
 * survives the OS clearing the cache and can be cleaned up like any other
 * voice log. (The recorder used to write to its own default location and the
 * file was copied after stopping.)
 */
export function newRecordingPath(): string {
  const extension = Platform.OS === 'ios' ? 'm4a' : 'mp4';
  return `${RNFS.DocumentDirectoryPath}/voice-log_${uuidv4()}.${extension}`;
}

/** Records that a recording has started without replacing an unresolved one. */
export async function markRecordingStarted(
  pending: PendingRecording,
): Promise<void> {
  return serialized(async () => {
    if (await readMarker()) throw new Error('A recording is awaiting recovery');
    await AsyncStorage.setItem(KEY, JSON.stringify(pending));
  });
}

async function readMarker(): Promise<PendingRecording | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = PendingRecordingSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Invalid JSON is handled like an invalid marker below.
  }
  await AsyncStorage.removeItem(KEY);
  return null;
}

/** The marker left by a recording that never finished, if any. */
export function readPendingRecording(): Promise<PendingRecording | null> {
  return serialized(readMarker);
}

/**
 * Removes the marker, but only if it is still about `path`: a new recording
 * may have replaced it since this one was read.
 */
export function clearPendingRecording(path: string): Promise<void> {
  return serialized(async () => {
    const current = await readMarker();
    if (current?.path === path) await AsyncStorage.removeItem(KEY);
  });
}
