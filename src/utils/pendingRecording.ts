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

/** Records that a recording has started at `path`. */
export async function markRecordingStarted(
  pending: PendingRecording,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pending));
  } catch (error) {
    // Recording still works; only recovery after a crash is lost.
    console.warn('Could not mark the voice log recording:', error);
  }
}

/** Reads the marker without clearing it; errors must abort destructive work. */
export async function readPendingRecordingStrict(): Promise<PendingRecording | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === null) return null;
  return PendingRecordingSchema.parse(JSON.parse(raw));
}

/** The marker left by a recording that never finished, if any. */
export async function readPendingRecording(): Promise<PendingRecording | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = PendingRecordingSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Unreadable: treat as no marker, and clear it below.
  }
  await AsyncStorage.removeItem(KEY).catch(() => {});
  return null;
}

/**
 * Removes the marker, but only if it is still about `path`: a new recording
 * may have replaced it since this one was read.
 */
export async function clearPendingRecording(path: string): Promise<void> {
  try {
    const current = await readPendingRecording();
    if (current?.path === path) await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.warn('Could not clear the voice log recording marker:', error);
  }
}
