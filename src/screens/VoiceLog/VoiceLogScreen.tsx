import {
  NavigationAction,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useNotesStore } from '../../stores';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { WAVEFORM_BUCKET_MS } from '../../utils/audioLevel';
import EmptyState from './components/EmptyState';
import RecordingControls from './components/RecordingControls';
import VoiceLogCard from './components/VoiceLogCard';
import { useVoiceLogPlayer } from './useVoiceLogPlayer';
import { RecordedVoiceLog, useVoiceRecorder } from './useVoiceRecorder';

const isAndroid = Platform.OS === 'android';

const MAX_DURATION_MS = 12 * 1000;
const WAVEFORM_SLOTS = MAX_DURATION_MS / WAVEFORM_BUCKET_MS;

/**
 * Voice Log Screen
 *
 * One screen: the recorder on top, saved logs below, newest first.
 *
 * - One-tap recording with a live waveform that fills over the 12 seconds,
 *   stopping by itself at the limit
 * - A saving state on the button; the new log then appears at the top of the
 *   list, marked as new
 * - Leaving while recording (the swipe, Back, the logo, a tab) stops and
 *   saves first, then leaves
 * - Timestamp saved at once; GPS location added when a fix arrives
 * - Play, pause and seek saved logs (tap the waveform), and delete them
 *
 * @returns A React element rendering the Voice Log screen.
 */
export default observer(function VoiceLogScreen() {
  const notes = useNotesStore();
  const navigation = useNavigation();
  const player = useVoiceLogPlayer();
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<NavigationAction | null>(
    null,
  );

  const save = useCallback(
    ({ audioUri, duration, waveform }: RecordedVoiceLog) =>
      notes.createVoiceLog({ audioUri, duration, waveform }),
    [notes],
  );

  const recorder = useVoiceRecorder({
    maxDurationMs: MAX_DURATION_MS,
    bucketMs: WAVEFORM_BUCKET_MS,
    save,
    onSaved: setLastSavedId,
    // Playback would be picked up by the microphone.
    onWillStart: player.stop,
  });

  // Leaving mid-recording saves the recording first. The leave is held until
  // the recorder is idle again (and so no longer preventing removal);
  // dispatching it from the save callback would be blocked a second time.
  usePreventRemove(recorder.status !== 'idle', ({ data }) => {
    if (pendingLeave) return;
    player.stop();
    setPendingLeave(data.action);
    recorder.settle();
  });

  useEffect(() => {
    if (pendingLeave && recorder.status === 'idle') {
      setPendingLeave(null);
      navigation.dispatch(pendingLeave);
    }
  }, [navigation, pendingLeave, recorder.status]);

  const voiceLogs = notes.notes.filter(
    (note) => note.category === 'Voice Logs',
  );
  const busy = recorder.status === 'starting' || recorder.status === 'saving';

  const handleDelete = (noteId: string) => {
    Alert.alert(
      'Delete Voice Log',
      'Are you sure you want to delete this voice log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            player.release(noteId);
            notes.deleteNote(noteId);
          },
        },
      ],
    );
  };

  return (
    <StackScreen title="Voice Logs">
      <View style={styles.column}>
        <RecordingControls
          status={recorder.status}
          elapsedMs={recorder.elapsedMs}
          maxDurationMs={MAX_DURATION_MS}
          waveform={recorder.waveform}
          waveformSlots={WAVEFORM_SLOTS}
          disabled={busy || pendingLeave !== null}
          onStartRecording={recorder.start}
          onStopRecording={recorder.stop}
        />

        <SectionEyebrow inline>Saved logs</SectionEyebrow>
        {voiceLogs.length === 0 ? (
          <EmptyState
            icon="mic-off-outline"
            title="No voice logs yet"
            subtitle="Your recordings will appear here"
          />
        ) : (
          voiceLogs.map((log) => (
            <VoiceLogCard
              key={log.id}
              title={log.title}
              createdAt={log.createdAt}
              duration={log.duration}
              audioUri={log.audioUri}
              waveform={log.waveform}
              isNew={log.id === lastSavedId}
              playback={
                player.playback?.id === log.id ? player.playback : undefined
              }
              onPlay={() => log.audioUri && player.toggle(log.id, log.audioUri)}
              onSeek={(fraction) =>
                log.audioUri && player.seek(log.id, log.audioUri, fraction)
              }
              onDelete={() => handleDelete(log.id)}
            />
          ))
        )}
      </View>
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  column: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    paddingBottom: SPACING.xl,
  },
});
