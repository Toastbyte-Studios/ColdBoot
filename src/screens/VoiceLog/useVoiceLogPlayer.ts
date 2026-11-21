import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Sound from 'react-native-sound';

/** How often the playhead moves while a log plays. */
const POSITION_POLL_MS = 100;

export type PlaybackState = 'loading' | 'playing' | 'paused';

/** The log the player has open, and where it is in it. */
export type Playback = {
  id: string;
  state: PlaybackState;
  /** Seconds into the log. */
  positionSec: number;
  /** The file's length in seconds, once loaded (0 while loading). */
  durationSec: number;
};

export type VoiceLogPlayer = {
  /** The open log, if any. Cleared when it finishes or is stopped. */
  playback: Playback | null;
  /**
   * Play button: plays a log; on the open log, pauses or resumes it (or
   * cancels it while it's still loading).
   */
  toggle: (id: string, audioUri: string) => void;
  /**
   * Moves to a point in a log, 0 to 1. On a log that isn't open, starts it
   * playing from there.
   */
  seek: (id: string, audioUri: string, fraction: number) => void;
  /** Stops and closes whatever is open. */
  stop: () => void;
  /** Stops playback if it is this log (about to be deleted, say). */
  release: (id: string) => void;
};

const clamp01 = (value: number) =>
  isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/**
 * Plays one voice log at a time, with pause, resume and seek.
 *
 * Loading a sound is asynchronous and can't be cancelled, so every open and
 * stop bumps a version number; a load, finish or position callback from an
 * older version releases its sound (if it still holds one) and changes
 * nothing else. That keeps a quick play–stop–play from playing two logs at
 * once, or a stale "finished" callback from closing the newer log.
 *
 * Playback stops when the component using it unmounts.
 */
export function useVoiceLogPlayer(): VoiceLogPlayer {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const playbackRef = useRef<Playback | null>(null);
  const versionRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = useCallback((next: Playback | null) => {
    playbackRef.current = next;
    setPlayback(next);
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  /** Stops and releases the current sound, without touching React state. */
  const halt = useCallback(() => {
    versionRef.current += 1;
    stopPolling();
    playbackRef.current = null;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      sound.stop(() => sound.release());
    }
  }, []);

  const stop = useCallback(() => {
    halt();
    update(null);
  }, [halt, update]);

  const release = useCallback(
    (id: string) => {
      if (playbackRef.current?.id === id) stop();
    },
    [stop],
  );

  useEffect(() => halt, [halt]);

  /** Plays the loaded sound from where it is, and moves the playhead. */
  const play = useCallback(
    (sound: Sound, version: number) => {
      const current = playbackRef.current;
      if (!current) return;
      update({ ...current, state: 'playing' });

      stopPolling();
      pollRef.current = setInterval(() => {
        const requestedPlayback = playbackRef.current;
        sound.getCurrentTime((seconds) => {
          const open = playbackRef.current;
          if (
            versionRef.current !== version ||
            open?.state !== 'playing' ||
            open !== requestedPlayback
          ) {
            return;
          }
          update({ ...open, positionSec: seconds });
        });
      }, POSITION_POLL_MS);

      sound.play((success) => {
        if (versionRef.current !== version) return;
        if (!success) {
          console.error('Failed to play sound');
          Alert.alert('Error', 'Failed to play audio.');
        }
        // Finished: close the log; the next play starts from the top.
        stopPolling();
        sound.release();
        if (soundRef.current === sound) soundRef.current = null;
        playbackRef.current = null;
        update(null);
      });
    },
    [update],
  );

  /** Opens a log and plays it, from `startFraction` of the way in. */
  const open = useCallback(
    (id: string, audioUri: string, startFraction: number) => {
      halt();
      const version = versionRef.current;
      update({ id, state: 'loading', positionSec: 0, durationSec: 0 });
      try {
        const sound = new Sound(audioUri, '', (error) => {
          if (versionRef.current !== version) {
            sound.release();
            return;
          }
          if (error) {
            console.error('Failed to load sound:', error);
            Alert.alert('Error', 'Failed to load audio file.');
            sound.release();
            update(null);
            return;
          }
          soundRef.current = sound;
          const durationSec = Math.max(0, sound.getDuration());
          const positionSec = clamp01(startFraction) * durationSec;
          if (positionSec > 0) sound.setCurrentTime(positionSec);
          update({ id, state: 'loading', positionSec, durationSec });
          play(sound, version);
        });
      } catch (error) {
        console.error('Error playing voice log:', error);
        Alert.alert('Error', 'Failed to play voice log.');
        update(null);
      }
    },
    [halt, play, update],
  );

  const toggle = useCallback(
    (id: string, audioUri: string) => {
      const current = playbackRef.current;
      const sound = soundRef.current;
      if (current?.id !== id) {
        open(id, audioUri, 0);
        return;
      }
      if (current.state === 'loading' || !sound) {
        stop();
      } else if (current.state === 'playing') {
        stopPolling();
        sound.pause();
        update({ ...current, state: 'paused' });
      } else {
        play(sound, versionRef.current);
      }
    },
    [open, play, stop, update],
  );

  const seek = useCallback(
    (id: string, audioUri: string, fraction: number) => {
      const current = playbackRef.current;
      const sound = soundRef.current;
      if (current?.id !== id || !sound || current.state === 'loading') {
        open(id, audioUri, fraction);
        return;
      }
      const positionSec = clamp01(fraction) * current.durationSec;
      sound.setCurrentTime(positionSec);
      update({ ...current, positionSec });
    },
    [open, update],
  );

  return { playback, toggle, seek, stop, release };
}
