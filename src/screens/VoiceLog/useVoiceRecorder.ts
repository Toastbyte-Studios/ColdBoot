import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
  Vibration,
} from 'react-native';
import { useSoundRecorder } from 'react-native-nitro-sound';
import {
  addWaveformSample,
  normalizeMeteringLevel,
} from '../../utils/audioLevel';
import { deleteAttachmentFiles } from '../../utils/noteAttachments';
import {
  clearPendingRecording,
  markRecordingStarted,
  newRecordingPath,
} from '../../utils/pendingRecording';
import type { RecordingStatus } from './components/RecordingControls';

/** How often the recorder reports position and level, in seconds. */
const RECORDER_UPDATE_SECONDS = 0.1;
const NO_SAMPLES: readonly number[] = [];

/** A finished recording, in permanent storage, ready to save. */
export type RecordedVoiceLog = {
  /** `file://` URI in the Documents directory. */
  audioUri: string;
  /** Whole seconds, at least 1. */
  duration: number;
  /** The live waveform as it was when recording stopped. */
  waveform: readonly number[];
};

type Options = {
  /** Recording stops by itself at this length. */
  maxDurationMs: number;
  /** Recording time per waveform bar. */
  bucketMs: number;
  /** Writes the log. Its file is deleted if this throws. */
  save: (recording: RecordedVoiceLog) => Promise<{ id: string }>;
  /** Called with the new log's id once it is saved. */
  onSaved?: (id: string) => void;
  /** Called just before recording starts (to stop playback, say). */
  onWillStart?: () => void;
};

export type VoiceRecorder = {
  status: RecordingStatus;
  elapsedMs: number;
  waveform: readonly number[];
  start: () => void;
  /** Stops and saves. Resolves once the log is saved (or saving failed). */
  stop: () => Promise<void>;
  /**
   * Brings the recorder to rest: waits for a start in progress, then stops
   * and saves. Resolves straight away when idle. Used before leaving.
   */
  settle: () => Promise<void>;
};

async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return true; // iOS permissions handled by Info.plist
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Audio Recording Permission',
        message:
          'This app needs access to your microphone to record voice logs.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
}

/**
 * Records a voice log: microphone permission, the recorder, the live
 * waveform, the auto-stop, and handing the finished file to `save`.
 *
 * The file is written straight into Documents, and a marker
 * (`pendingRecording`) is kept while recording, so a recording cut off by
 * the app closing can be offered back on the next visit. Going to the
 * background stops and saves: neither platform lets the app keep the
 * microphone there (iOS has no audio background mode), and a backgrounded
 * app is the one the OS kills.
 *
 * Start and stop are idempotent while one is in flight: a second tap, or a
 * Back press during a save, waits for the same promise instead of starting
 * another.
 */
export function useVoiceRecorder(options: Options): VoiceRecorder {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveform, setWaveform] = useState<readonly number[]>(NO_SAMPLES);

  // The recorder registers onRecord once, on mount, and start/stop run
  // across awaits, so everything they read lives in refs.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const isRecordingRef = useRef(false);
  const audioPathRef = useRef<string | null>(null);
  const elapsedMsRef = useRef(0);
  const waveformRef = useRef<readonly number[]>(NO_SAMPLES);
  const startingRef = useRef<Promise<void> | null>(null);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const stopRecorderRef = useRef<(() => Promise<string | undefined>) | null>(
    null,
  );

  const resetLive = () => {
    elapsedMsRef.current = 0;
    waveformRef.current = NO_SAMPLES;
    setElapsedMs(0);
    setWaveform(NO_SAMPLES);
  };

  const { startRecorder, stopRecorder } = useSoundRecorder({
    subscriptionDuration: RECORDER_UPDATE_SECONDS,
    onRecord: (e) => {
      if (!isRecordingRef.current || stoppingRef.current) return;
      const { maxDurationMs, bucketMs } = optionsRef.current;
      const position = Math.min(e.currentPosition, maxDurationMs);
      elapsedMsRef.current = position;
      setElapsedMs(position);
      // The last update can land exactly on the limit; that's one bucket
      // past the strip, so it goes in the final bar.
      waveformRef.current = addWaveformSample(
        waveformRef.current,
        Math.min(position, maxDurationMs - 1),
        normalizeMeteringLevel(e.currentMetering),
        bucketMs,
      );
      setWaveform(waveformRef.current);

      if (position >= maxDurationMs) {
        stopRef.current?.();
      }
    },
  });

  useEffect(() => {
    stopRecorderRef.current = stopRecorder;
  }, [stopRecorder]);

  const stop = useCallback((): Promise<void> => {
    if (stoppingRef.current) return stoppingRef.current;
    if (!isRecordingRef.current) return Promise.resolve();

    setStatus('saving');
    const stopping = (async () => {
      try {
        let result: string | undefined;
        try {
          result = await stopRecorderRef.current?.();
        } catch (error) {
          console.warn('Error stopping recorder:', error);
          result = audioPathRef.current || undefined;
        }

        // Whole seconds, at least one: a tap-and-release still made a file.
        const duration = Math.max(1, Math.round(elapsedMsRef.current / 1000));
        const recordedWaveform = waveformRef.current;
        // The path it was asked to write to; the recorder reports the same
        // file (as a URL on iOS).
        const audioUri = audioPathRef.current || result;
        isRecordingRef.current = false;

        if (!audioUri) {
          Alert.alert('Error', 'Failed to record audio. Please try again.');
          return;
        }

        Vibration.vibrate(200);

        const recordingPath = audioUri.startsWith('file://')
          ? audioUri.slice('file://'.length)
          : audioUri;
        const recordingUri = `file://${recordingPath}`;
        let saved: { id: string } | undefined;
        try {
          saved = await optionsRef.current.save({
            audioUri: recordingUri,
            duration,
            waveform: recordedWaveform,
          });
        } catch (error) {
          await deleteAttachmentFiles([recordingUri]);
          throw error;
        }

        if (saved) optionsRef.current.onSaved?.(saved.id);
        AccessibilityInfo.announceForAccessibility('Voice log saved');
      } catch (error) {
        console.error('Failed to save voice log:', error);
        Alert.alert('Error', 'Failed to save voice log. Please try again.');
      } finally {
        // Saved, or deleted after a failed save: either way it is settled.
        if (audioPathRef.current) {
          await clearPendingRecording(audioPathRef.current);
        }
        // Every path that ends a recording resets the recorder.
        isRecordingRef.current = false;
        audioPathRef.current = null;
        resetLive();
        setStatus('idle');
        stoppingRef.current = null;
      }
    })();
    stoppingRef.current = stopping;
    return stopping;
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(() => {
    if (startingRef.current || stoppingRef.current || isRecordingRef.current) {
      return;
    }

    optionsRef.current.onWillStart?.();
    setStatus('starting');
    const starting = (async () => {
      let started = false;
      let path: string | null = null;
      try {
        const hasPermission = await requestAudioPermission();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Microphone permission is required to record audio.',
          );
          return;
        }

        resetLive();
        path = newRecordingPath();
        await markRecordingStarted({ path, startedAt: Date.now() });
        // The third argument turns on metering, which feeds the waveform.
        await startRecorder(path, undefined, true);
        audioPathRef.current = path;
        isRecordingRef.current = true;
        started = true;
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please try again.');
        if (path) {
          await deleteAttachmentFiles([`file://${path}`]);
          await clearPendingRecording(path);
        }
      } finally {
        startingRef.current = null;
        setStatus(started ? 'recording' : 'idle');
      }
    })();
    startingRef.current = starting;
  }, [startRecorder]);

  const settle = useCallback(async () => {
    await startingRef.current;
    await stop();
  }, [stop]);

  // Backgrounded mid-recording: save now, while the app still can.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (
        state === 'background' &&
        (isRecordingRef.current || startingRef.current)
      ) {
        settle();
      }
    });
    return () => subscription.remove();
  }, [settle]);

  // Unmounting mid-recording (the app closing the screen some other way)
  // stops the recorder so the microphone is released. The marker stays, so
  // the finished file is offered back on the next visit.
  useEffect(
    () => () => {
      if (
        isRecordingRef.current &&
        !stoppingRef.current &&
        stopRecorderRef.current
      ) {
        stopRecorderRef.current().catch((err) => {
          console.warn('Error stopping recorder on unmount:', err);
        });
      }
    },
    [],
  );

  return { status, elapsedMs, waveform, start, stop, settle };
}
