import { usePreventRemove } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  StyleSheet,
  View,
  Alert,
  Vibration,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  useSoundRecorder,
  // AudioEncoderAndroidType,
} from 'react-native-nitro-sound';
import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/Ionicons';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore } from '../../stores';
import { SCREEN_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { normalizeMeteringLevel, smoothLevel } from '../../utils/audioLevel';
import EmptyState from './components/EmptyState';
import InfoBox from './components/InfoBox';
import RecordingControls from './components/RecordingControls';
import VoiceLogCard from './components/VoiceLogCard';

const isAndroid = Platform.OS === 'android';

const MAX_DURATION_SECONDS = 12;

/**
 * Voice Log Screen
 *
 * Allows users to record short voice notes (max 12 seconds) with automatic metadata capture
 * or view and manage previously recorded voice logs.
 *
 * Features:
 * - One-tap recording with visual feedback
 * - Auto-stop at 12-second limit
 * - Haptic feedback on completion
 * - Automatic timestamp and location capture
 * - View, play, and delete saved voice logs
 * - Voice logs are stored separately from regular notes
 *
 * @returns A React element rendering the Voice Log screen.
 */
export default observer(function VoiceLogScreen() {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const core = useNotesStore();
  const [mode, setMode] = useState<'select' | 'record' | 'view'>('select');
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const playbackVersionRef = useRef(0);
  const stopRecorderRef = useRef<(() => Promise<string | undefined>) | null>(
    null,
  );
  const isRecordingRef = useRef(false);
  const audioPathRef = useRef<string | null>(null);
  const recordingTimeRef = useRef(0);
  const startingRef = useRef<Promise<void> | null>(null);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const goingBackRef = useRef(false);
  const handleStopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  // Stabilize handleStopRecording function reference using useCallback
  const handleStopRecording = useCallback((): Promise<void> => {
    if (stoppingRef.current) return stoppingRef.current;
    if (!isRecordingRef.current) return Promise.resolve();

    setIsBusy(true);
    const stopping = (async () => {
      try {
        // Stop recording first - wrap in try/catch in case recorder isn't active
        let result: string | undefined;
        try {
          result = await stopRecorderRef.current?.();
        } catch (error) {
          console.warn('Error stopping recorder:', error);
          result = audioPathRef.current || undefined;
        }

        const duration = recordingTimeRef.current;
        const audioUri = result || audioPathRef.current;

        // Validate audio path before changing state
        if (!audioUri) {
          Alert.alert('Error', 'Failed to record audio. Please try again.');
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          audioPathRef.current = null;
          setMicLevel(0);
          return;
        }

        // Update state after successful recording stop
        isRecordingRef.current = false;
        setIsRecording(false);

        // Haptic feedback
        Vibration.vibrate(200);

        // Save voice log
        await core.createVoiceLog({
          audioUri: audioUri,
          duration: duration,
          transcription: undefined, // Transcription not implemented yet
        });

        // Back to the Voice Logs menu, not out of the tool: the three views
        // here are local state, so goBack() used to leave for the Core module.
        setRecordingTime(0);
        audioPathRef.current = null;
        setMicLevel(0);
        setMode('select');
        Alert.alert('Saved', 'Voice log saved successfully');
      } catch (error) {
        console.error('Failed to save voice log:', error);
        Alert.alert('Error', 'Failed to save voice log. Please try again.');
        // Ensure recording state is reset even when saving fails
        isRecordingRef.current = false;
        setIsRecording(false);
        setRecordingTime(0);
        audioPathRef.current = null;
        setMicLevel(0);
      } finally {
        stoppingRef.current = null;
        setIsBusy(false);
      }
    })();
    stoppingRef.current = stopping;
    return stopping;
  }, [core]);

  // Store handleStopRecording in ref for use in callback
  useEffect(() => {
    handleStopRecordingRef.current = handleStopRecording;
  }, [handleStopRecording]);

  // Initialize sound recorder
  const { startRecorder, stopRecorder } = useSoundRecorder({
    onRecord: (e) => {
      if (!isRecordingRef.current || stoppingRef.current) return;
      const currentTime = Math.floor(e.currentPosition / 1000);
      recordingTimeRef.current = currentTime;
      setRecordingTime(currentTime);
      setMicLevel((previous) =>
        smoothLevel(previous, normalizeMeteringLevel(e.currentMetering)),
      );

      // Auto-stop at max duration - use ref to avoid stale closure
      if (
        currentTime >= MAX_DURATION_SECONDS &&
        handleStopRecordingRef.current
      ) {
        handleStopRecordingRef.current();
      }
    },
  });

  // Store stopRecorder in ref for cleanup
  useEffect(() => {
    stopRecorderRef.current = stopRecorder;
  }, [stopRecorder]);

  const stopPlayback = useCallback(() => {
    playbackVersionRef.current += 1;
    playingIdRef.current = null;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      sound.stop(() => sound.release());
    }
  }, []);

  // Cleanup on unmount only (empty dependency array)
  useEffect(() => {
    return () => {
      // Stop active recording if component unmounts
      if (
        isRecordingRef.current &&
        !stoppingRef.current &&
        stopRecorderRef.current
      ) {
        stopRecorderRef.current().catch((err) => {
          console.warn('Error stopping recorder on unmount:', err);
        });
      }

      stopPlayback();
    };
  }, [stopPlayback]);

  // Record and Saved Voice Logs are steps inside this screen, not screens of
  // their own, so going back (the swipe, Android's system Back, iOS's edge
  // swipe) returns to the Voice Log menu instead of leaving the tool. A
  // recording in progress is stopped and saved, as the stop button would;
  // playback stops.
  const handleBack = async () => {
    if (goingBackRef.current) return;
    goingBackRef.current = true;
    stopPlayback();
    setPlayingId(null);
    await startingRef.current;
    await handleStopRecordingRef.current?.();
    setMode('select');
    goingBackRef.current = false;
  };

  usePreventRemove(mode !== 'select', handleBack);

  const requestAudioPermission = async (): Promise<boolean> => {
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
  };

  const handleStartRecording = () => {
    if (
      startingRef.current ||
      stoppingRef.current ||
      goingBackRef.current ||
      isRecordingRef.current
    )
      return;

    setIsBusy(true);
    const starting = (async () => {
      try {
        // Request permission on Android
        const hasPermission = await requestAudioPermission();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Microphone permission is required to record audio.',
          );
          return;
        }

        setRecordingTime(0);
        recordingTimeRef.current = 0;
        setMicLevel(0);

        // Start recording - library uses default writable cache directory
        // Third argument enables metering, which feeds the level meter.
        const path = await startRecorder(undefined, undefined, true);

        audioPathRef.current = path;
        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please try again.');
        setIsRecording(false);
      } finally {
        startingRef.current = null;
        setIsBusy(false);
      }
    })();
    startingRef.current = starting;
  };

  const progress = recordingTime / MAX_DURATION_SECONDS;

  // Get only voice logs from notes
  const voiceLogs = core.notes.filter((note) => note.category === 'Voice Logs');

  const handlePlayVoiceLog = (noteId: string, audioUri: string) => {
    if (goingBackRef.current) return;
    try {
      // Stop any currently playing sound
      if (playingIdRef.current) {
        stopPlayback();
        setPlayingId(null);
        return;
      }

      // Start playing new sound
      const version = ++playbackVersionRef.current;
      playingIdRef.current = noteId;
      setPlayingId(noteId);

      // Load audio file
      const sound = new Sound(audioUri, '', (error) => {
        if (playbackVersionRef.current !== version) {
          sound.release();
          return;
        }
        if (error) {
          console.error('Failed to load sound:', error);
          Alert.alert('Error', 'Failed to load audio file.');
          sound.release();
          playingIdRef.current = null;
          setPlayingId(null);
          return;
        }

        // Play the sound
        soundRef.current = sound;
        sound.play((success) => {
          if (playbackVersionRef.current !== version) return;
          playingIdRef.current = null;
          if (success) {
            setPlayingId(null);
          } else {
            console.error('Failed to play sound');
            Alert.alert('Error', 'Failed to play audio.');
            setPlayingId(null);
          }

          // Release sound resources after playback completes
          sound.release();
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
        });
      });
    } catch (error) {
      console.error('Error playing voice log:', error);
      Alert.alert('Error', 'Failed to play voice log.');
      playingIdRef.current = null;
      setPlayingId(null);
    }
  };

  const handleDeleteVoiceLog = (noteId: string) => {
    Alert.alert(
      'Delete Voice Log',
      'Are you sure you want to delete this voice log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Stop playing if this is the currently playing log
            if (playingIdRef.current === noteId) {
              stopPlayback();
              setPlayingId(null);
            }
            core.deleteNote(noteId);
          },
        },
      ],
    );
  };

  // Mode: Select recording or viewing
  if (mode === 'select') {
    return (
      <StackScreen title="Voice Logs">
        <GroupContainer>
          <ModuleRow
            title="Record voice log"
            subtitle="Create a new voice note"
            icon="mic-outline"
            variant="tool"
            onPress={() => {
              setMode('record');
              setRecordingTime(0);
              audioPathRef.current = null;
            }}
          />
          <ModuleRow
            title="View voice logs"
            subtitle={`${voiceLogs.length} saved ${voiceLogs.length === 1 ? 'log' : 'logs'}`}
            icon="list-outline"
            variant="tool"
            showSeparator={false}
            onPress={() => setMode('view')}
          />
        </GroupContainer>
      </StackScreen>
    );
  }

  // Mode: Record
  if (mode === 'record') {
    return (
      <StackScreen
        title="Record Voice Log"
        note={`Tap to record a voice note. Maximum duration: ${MAX_DURATION_SECONDS} seconds.`}
      >
        <View style={styles.column}>
          <RecordingControls
            isRecording={isRecording}
            recordingTime={recordingTime}
            progress={progress}
            maxDuration={MAX_DURATION_SECONDS}
            level={micLevel}
            disabled={isBusy}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />

          <InfoBox icon="time-outline">
            <View>
              <Text style={styles.featuresTitle}>Auto-captured metadata:</Text>
              <View style={styles.featureRow}>
                <Icon
                  name="time-outline"
                  size={16}
                  color={COLORS.PRIMARY_DARK}
                />
                <Text style={styles.featureText}>Timestamp</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon
                  name="location-outline"
                  size={16}
                  color={COLORS.PRIMARY_DARK}
                />
                <Text style={styles.featureText}>
                  GPS Location (if available)
                </Text>
              </View>
            </View>
          </InfoBox>
        </View>
      </StackScreen>
    );
  }

  // Mode: View
  return (
    <StackScreen title="Saved Voice Logs">
      <View style={styles.column}>
        {voiceLogs.length === 0 ? (
          <EmptyState
            icon="mic-off-outline"
            title="No voice logs yet"
            subtitle="Record your first voice log to get started"
          />
        ) : (
          voiceLogs.map((log) => (
            <VoiceLogCard
              key={log.id}
              title={log.title}
              createdAt={log.createdAt}
              duration={log.duration}
              audioUri={log.audioUri}
              isPlaying={playingId === log.id}
              onPlay={() => handlePlayVoiceLog(log.id, log.audioUri!)}
              onDelete={() => handleDeleteVoiceLog(log.id)}
            />
          ))
        )}
      </View>
    </StackScreen>
  );
});

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    column: {
      // StackScreen's Android content is full-bleed; cards carry the gutter.
      paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    },
    featuresTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    featureText: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      marginLeft: 8,
    },
  });
