import {
  NavigationAction,
  NavigationProp,
  ParamListBase,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useNotesStore, useSettingsStore, useStores } from '../../stores';
import { VOICE_LOG_LENGTHS } from '../../stores/SettingsStore';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { WAVEFORM_BARS } from '../../utils/audioLevel';
import EmptyState from './components/EmptyState';
import RecordingControls from './components/RecordingControls';
import RecoveryNotice from './components/RecoveryNotice';
import VoiceLogCard from './components/VoiceLogCard';
import { useRecordingRecovery } from './useRecordingRecovery';
import { useVoiceLogPlayer } from './useVoiceLogPlayer';
import { RecordedVoiceLog, useVoiceRecorder } from './useVoiceRecorder';

const isAndroid = Platform.OS === 'android';

/** How much of the map "Show on map" frames around a log's location. */
const MAP_RADIUS_MILES = 0.25;

/**
 * Voice Log Screen
 *
 * One screen: the recorder on top, saved logs below, newest first.
 *
 * - One-tap recording with a live waveform that fills as the time runs,
 *   stopping by itself at the limit (12 s to 5 min, chosen on the recorder
 *   card and kept in Settings)
 * - A saving state on the button; the new log then appears at the top of the
 *   list, marked as new
 * - Leaving while recording (the swipe, Back, the logo, a tab) stops and
 *   saves first, then leaves
 * - Timestamp saved at once; GPS location added when a fix arrives
 * - Going to the background saves a recording in progress; one cut off by
 *   the app closing is offered back on the next visit if its file plays
 * - Play, pause and seek saved logs (tap the waveform)
 * - Rename a log, see where it was recorded and open the Map there, delete
 *
 * @returns A React element rendering the Voice Log screen.
 */
export default observer(function VoiceLogScreen() {
  const notes = useNotesStore();
  const rootStore = useStores();
  const settings = useSettingsStore();
  const maxDurationMs = settings.voiceLogMaxSeconds * 1000;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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

  // A recording cut off by the app closing, offered back once.
  const recovered = useRecordingRecovery({
    isSaved: async (path) => {
      await rootStore.startupPromise;
      return notes.hasSavedAudioAttachment(path);
    },
    save: ({ audioUri, duration, createdAt }) =>
      notes.createVoiceLog({ audioUri, duration, createdAt, locate: false }),
    onSaved: setLastSavedId,
  });

  const recorder = useVoiceRecorder({
    maxDurationMs,
    bucketMs: maxDurationMs / WAVEFORM_BARS,
    save,
    onSaved: setLastSavedId,
    // Playback would be picked up by the microphone.
    onWillStart: player.stop,
    onUnsettled: recovered.retry,
  });

  // Leaving mid-recording saves the recording first. The leave is held until
  // the recorder is idle again (and so no longer preventing removal);
  // dispatching it from the save callback would be blocked a second time.
  usePreventRemove(recorder.status !== 'idle' || recovered.busy, ({ data }) => {
    if (pendingLeave) return;
    player.stop();
    setPendingLeave(data.action);
    recorder.settle();
  });

  useEffect(() => {
    if (pendingLeave && recorder.status === 'idle' && !recovered.busy) {
      setPendingLeave(null);
      navigation.dispatch(pendingLeave);
    }
  }, [navigation, pendingLeave, recorder.status, recovered.busy]);

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
        {recovered.recovery ? (
          <RecoveryNotice
            recovery={recovered.recovery}
            busy={recovered.busy}
            onSave={recovered.keep}
            onDiscard={recovered.discard}
            onDismiss={recovered.dismiss}
            onRetry={recovered.retry}
          />
        ) : null}
        <RecordingControls
          status={recorder.status}
          elapsedMs={recorder.elapsedMs}
          maxDurationMs={maxDurationMs}
          waveform={recorder.waveform}
          waveformSlots={WAVEFORM_BARS}
          lengthOptions={VOICE_LOG_LENGTHS}
          onChangeMaxLength={settings.setVoiceLogMaxSeconds}
          disabled={busy || pendingLeave !== null || recovered.blocked}
          onStartRecording={() => {
            if (!recovered.blocked) recorder.start();
          }}
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
              latitude={log.latitude}
              longitude={log.longitude}
              onRename={(newTitle) => notes.renameNote(log.id, newTitle)}
              onShowOnMap={() => {
                if (log.latitude === undefined || log.longitude === undefined) {
                  return;
                }
                player.stop();
                navigation.navigate('MapScreen', {
                  center: { latitude: log.latitude, longitude: log.longitude },
                  radiusMiles: MAP_RADIUS_MILES,
                });
              }}
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
