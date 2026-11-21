import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import { deleteAttachmentFiles } from '../../utils/noteAttachments';
import {
  clearPendingRecording,
  PendingRecording,
  readPendingRecording,
  waitForActiveRecording,
} from './pendingRecording';

/** Shorter than this, a leftover file is treated as nothing worth keeping. */
const MIN_RECOVERABLE_SECONDS = 0.5;
let recoveryOperations: Promise<void> = Promise.resolve();

function serializeRecovery(operation: () => Promise<void>): Promise<void> {
  const result = recoveryOperations.then(operation);
  recoveryOperations = result.catch(() => {});
  return result;
}

export type Recovery =
  /** The leftover file plays: offer to save it. */
  | { kind: 'recoverable'; startedAt: number; durationSec: number }
  /** It was cut off too badly to play, and has been deleted. */
  | { kind: 'lost'; startedAt: number }
  | { kind: 'error' };

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
function probe(
  audioUri: string,
  registerCancel: (cancel: () => void) => void,
): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      let settled = false;
      const sound = new Sound(audioUri, '', (error) => {
        if (settled) {
          sound.release();
          return;
        }
        settled = true;
        const seconds = error ? null : sound.getDuration();
        sound.release();
        resolve(
          seconds !== null && seconds >= MIN_RECOVERABLE_SECONDS
            ? seconds
            : null,
        );
      });
      registerCancel(() => {
        if (settled) return;
        settled = true;
        sound.release();
        resolve(null);
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
  const [blocked, setBlocked] = useState(true);
  const [checkVersion, setCheckVersion] = useState(0);
  const workingRef = useRef(false);
  const pendingRef = useRef<PendingRecording | null>(null);
  const optionsRef = useRef({ isSaved, save, onSaved });
  optionsRef.current = { isSaved, save, onSaved };

  const retry = useCallback(() => {
    setBlocked(true);
    setRecovery(null);
    setCheckVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cancelProbe: (() => void) | undefined;
    serializeRecovery(async () => {
      try {
        if (cancelled) return;
        let pending: PendingRecording | null;
        do {
          await waitForActiveRecording();
          pending = await readPendingRecording();
          if (cancelled) return;
        } while (await waitForActiveRecording());
        if (cancelled) return;
        if (!pending) {
          setBlocked(false);
          return;
        }
        const alreadySaved = await optionsRef.current.isSaved(pending.path);
        if (cancelled) return;
        if (alreadySaved) {
          await clearPendingRecording(pending.path);
          if (!cancelled) setBlocked(false);
          return;
        }
        const audioUri = `file://${pending.path}`;
        const exists = await RNFS.exists(pending.path);
        if (cancelled) return;
        if (!exists) {
          await clearPendingRecording(pending.path);
          if (!cancelled) setBlocked(false);
          return;
        }
        const durationSec = await probe(audioUri, (cancel) => {
          cancelProbe = cancel;
        });
        if (cancelled) return;
        if (durationSec === null) {
          await deleteAttachmentFiles([audioUri], { queueFailures: false });
          await clearPendingRecording(pending.path);
          if (!cancelled) {
            setRecovery({ kind: 'lost', startedAt: pending.startedAt });
            setBlocked(false);
          }
          return;
        }
        pendingRef.current = pending;
        setRecovery({
          kind: 'recoverable',
          startedAt: pending.startedAt,
          durationSec,
        });
      } catch (error) {
        console.warn('Could not check the pending voice log:', error);
        if (!cancelled) setRecovery({ kind: 'error' });
      }
    });
    return () => {
      cancelled = true;
      cancelProbe?.();
    };
  }, [checkVersion]);

  const keep = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || recovery?.kind !== 'recoverable' || workingRef.current)
      return;
    workingRef.current = true;
    setBusy(true);
    let saved: { id: string } | undefined;
    try {
      await serializeRecovery(async () => {
        const current = await readPendingRecording();
        if (current?.path !== pending.path) return;
        if (await optionsRef.current.isSaved(pending.path)) {
          await clearPendingRecording(pending.path);
          return;
        }
        saved = await optionsRef.current.save({
          audioUri: `file://${pending.path}`,
          duration: Math.max(1, Math.round(recovery.durationSec)),
          createdAt: pending.startedAt,
        });
        await clearPendingRecording(pending.path);
      });
      pendingRef.current = null;
      setRecovery(null);
      setBlocked(false);
      if (saved) optionsRef.current.onSaved?.(saved.id);
    } catch (error) {
      console.error('Failed to save the recovered voice log:', error);
      if (saved) {
        pendingRef.current = null;
        setRecovery({ kind: 'error' });
        optionsRef.current.onSaved?.(saved.id);
      } else {
        Alert.alert(
          'Error',
          'Could not save the recording. Please try again, or discard it.',
        );
      }
    } finally {
      workingRef.current = false;
      setBusy(false);
    }
  }, [recovery]);

  const discard = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || workingRef.current) return;
    workingRef.current = true;
    setBusy(true);
    let deleted = false;
    try {
      await serializeRecovery(async () => {
        const current = await readPendingRecording();
        if (current?.path !== pending.path) return;
        if (await optionsRef.current.isSaved(pending.path)) {
          await clearPendingRecording(pending.path);
          return;
        }
        await deleteAttachmentFiles([`file://${pending.path}`], {
          queueFailures: false,
        });
        deleted = true;
        await clearPendingRecording(pending.path);
      });
      pendingRef.current = null;
      setRecovery(null);
      setBlocked(false);
    } catch (error) {
      console.warn('Could not discard the recording:', error);
      if (deleted) {
        pendingRef.current = null;
        setRecovery({ kind: 'error' });
      } else {
        Alert.alert(
          'Error',
          'Could not discard the recording. Please try again.',
        );
      }
    } finally {
      workingRef.current = false;
      setBusy(false);
    }
  }, []);

  /** Closes the "couldn't be recovered" notice. */
  const dismiss = useCallback(() => setRecovery(null), []);

  return { recovery, busy, blocked, keep, discard, dismiss, retry };
}
