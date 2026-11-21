import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import { deleteAttachmentFiles } from '../../utils/noteAttachments';
import {
  clearPendingRecording,
  PendingRecording,
  readPendingRecording,
} from './pendingRecording';

/** Shorter than this, a leftover file is treated as nothing worth keeping. */
const MIN_RECOVERABLE_SECONDS = 0.5;

export type Recovery =
  /** The leftover file plays: offer to save it. */
  | { kind: 'recoverable'; startedAt: number; durationSec: number }
  /** It was cut off too badly to play, and has been deleted. */
  | { kind: 'lost'; startedAt: number };

type Options = {
  /** Checks whether a saved note already owns this recording. */
  isSaved: (path: string) => Promise<boolean>;
  /** Saves the recovered file as a log, recorded at `startedAt`. */
  save: (recording: {
    audioUri: string;
    duration: number;
    createdAt: number;
  }) => Promise<{ id: string }>;
  onSaved?: (id: string) => void;
};

/**
 * Whether the leftover file plays, and for how long. A recording the app
 * never stopped usually has no index (an `.m4a` without its `moov` box) and
 * won't load; this says so rather than offering a file that can't be heard.
 */
function probe(audioUri: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const sound = new Sound(audioUri, '', (error) => {
        const seconds = error ? null : sound.getDuration();
        sound.release();
        resolve(
          seconds !== null && seconds >= MIN_RECOVERABLE_SECONDS
            ? seconds
            : null,
        );
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Finds a recording that was cut off by the app closing, once, when Voice
 * Log opens. If its file plays, it is offered back (save or discard); if not,
 * it is deleted and the user is told it couldn't be recovered.
 */
export function useRecordingRecovery({ isSaved, save, onSaved }: Options) {
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<PendingRecording | null>(null);
  const optionsRef = useRef({ isSaved, save, onSaved });
  optionsRef.current = { isSaved, save, onSaved };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = await readPendingRecording();
      if (!pending || cancelled) return;
      let alreadySaved: boolean;
      try {
        alreadySaved = await optionsRef.current.isSaved(pending.path);
      } catch (error) {
        console.warn('Could not check the pending voice log:', error);
        return;
      }
      if (cancelled) return;
      if (alreadySaved) {
        await clearPendingRecording(pending.path);
        return;
      }
      const audioUri = `file://${pending.path}`;
      const exists = await RNFS.exists(pending.path).catch(() => false);
      if (!exists) {
        // Nothing was written before it stopped.
        await clearPendingRecording(pending.path);
        return;
      }
      const durationSec = await probe(audioUri);
      if (cancelled) return;
      if (durationSec === null) {
        await deleteAttachmentFiles([audioUri]);
        await clearPendingRecording(pending.path);
        setRecovery({ kind: 'lost', startedAt: pending.startedAt });
        return;
      }
      pendingRef.current = pending;
      setRecovery({
        kind: 'recoverable',
        startedAt: pending.startedAt,
        durationSec,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const keep = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || recovery?.kind !== 'recoverable' || busy) return;
    setBusy(true);
    try {
      const saved = await optionsRef.current.save({
        audioUri: `file://${pending.path}`,
        duration: Math.max(1, Math.round(recovery.durationSec)),
        createdAt: pending.startedAt,
      });
      await clearPendingRecording(pending.path);
      pendingRef.current = null;
      setRecovery(null);
      optionsRef.current.onSaved?.(saved.id);
    } catch (error) {
      console.error('Failed to save the recovered voice log:', error);
      Alert.alert(
        'Error',
        'Could not save the recording. Please try again, or discard it.',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, recovery]);

  const discard = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setRecovery(null);
    if (pending) {
      await deleteAttachmentFiles([`file://${pending.path}`]);
      await clearPendingRecording(pending.path);
    }
  }, []);

  /** Closes the "couldn't be recovered" notice. */
  const dismiss = useCallback(() => setRecovery(null), []);

  return { recovery, busy, keep, discard, dismiss };
}
