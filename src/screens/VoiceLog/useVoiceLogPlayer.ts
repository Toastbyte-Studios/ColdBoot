import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Sound from 'react-native-sound';

export type VoiceLogPlayer = {
  /** The log that is loading or playing, if any. */
  playingId: string | null;
  /** Plays a log, or stops it if it's the one playing. */
  toggle: (id: string, audioUri: string) => void;
  /** Stops whatever is playing. */
  stop: () => void;
  /** Stops playback if it is this log (about to be deleted, say). */
  release: (id: string) => void;
};

/**
 * Plays one voice log at a time.
 *
 * Loading a sound is asynchronous and can't be cancelled, so every start and
 * stop bumps a version number; a load or finish callback from an older
 * version releases its sound and changes nothing else. That keeps a quick
 * play–stop–play from playing two logs at once, or from a stale "finished"
 * callback clearing the newer log's playing state.
 *
 * Playback stops when the component using it unmounts.
 */
export function useVoiceLogPlayer(): VoiceLogPlayer {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const versionRef = useRef(0);

  /** Stops and releases the current sound, without touching React state. */
  const halt = useCallback(() => {
    versionRef.current += 1;
    playingIdRef.current = null;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      sound.stop(() => sound.release());
    }
  }, []);

  const stop = useCallback(() => {
    halt();
    setPlayingId(null);
  }, [halt]);

  const release = useCallback(
    (id: string) => {
      if (playingIdRef.current === id) stop();
    },
    [stop],
  );

  useEffect(() => halt, [halt]);

  const toggle = useCallback(
    (id: string, audioUri: string) => {
      if (playingIdRef.current) {
        stop();
        return;
      }

      const version = ++versionRef.current;
      playingIdRef.current = id;
      setPlayingId(id);

      const finish = (sound: Sound) => {
        sound.release();
        if (soundRef.current === sound) soundRef.current = null;
        if (versionRef.current !== version) return;
        playingIdRef.current = null;
        setPlayingId(null);
      };

      try {
        const sound = new Sound(audioUri, '', (error) => {
          if (versionRef.current !== version) {
            sound.release();
            return;
          }
          if (error) {
            console.error('Failed to load sound:', error);
            Alert.alert('Error', 'Failed to load audio file.');
            finish(sound);
            return;
          }
          soundRef.current = sound;
          sound.play((success) => {
            if (versionRef.current !== version) return;
            if (!success) {
              console.error('Failed to play sound');
              Alert.alert('Error', 'Failed to play audio.');
            }
            finish(sound);
          });
        });
      } catch (error) {
        console.error('Error playing voice log:', error);
        Alert.alert('Error', 'Failed to play voice log.');
        playingIdRef.current = null;
        setPlayingId(null);
      }
    },
    [stop],
  );

  return { playingId, toggle, stop, release };
}
