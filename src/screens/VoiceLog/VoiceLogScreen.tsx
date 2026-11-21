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
import { type Note, useNotesStore, useSettingsStore } from '../../stores';
import { VOICE_LOG_LENGTHS } from '../../stores/SettingsStore';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { WAVEFORM_BARS } from '../../utils/audioLevel';
import EmptyState from './components/EmptyState';
import RecordingControls from './components/RecordingControls';
import VoiceLogCard from './components/VoiceLogCard';
import { type Playback, useVoiceLogPlayer } from './useVoiceLogPlayer';
import { RecordedVoiceLog, useVoiceRecorder } from './useVoiceRecorder';

const isAndroid = Platform.OS === 'android';

/** How much of the map "Show on map" frames around a log's location. */
const MAP_RADIUS_MILES = 0.25;

type SavedVoiceLogCardProps = {
  log: Note;
  isNew: boolean;
  playback?: Playback;
  onToggle: (id: string, audioUri: string) => void;
  onSeek: (id: string, audioUri: string, fraction: number) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onShowOnMap: (latitude: number, longitude: number) => Promise<void>;
  onDelete: (id: string) => void;
};

const SavedVoiceLogCard = observer(function SavedVoiceLogCardContent({
  log,
  isNew,
  playback,
  onToggle,
  onSeek,
  onRename,
  onShowOnMap,
  onDelete,
}: SavedVoiceLogCardProps) {
  const handlePlay = useCallback(() => {
    if (log.audioUri) onToggle(log.id, log.audioUri);
  }, [log.audioUri, log.id, onToggle]);

  const handleSeek = useCallback(
    (fraction: number) => {
      if (log.audioUri) onSeek(log.id, log.audioUri, fraction);
    },
    [log.audioUri, log.id, onSeek],
  );

  const handleDelete = useCallback(() => onDelete(log.id), [log.id, onDelete]);
  const handleRename = useCallback(
    (title: string) => onRename(log.id, title),
    [log.id, onRename],
  );
  const { latitude, longitude } = log;
  const handleShowOnMap = useCallback(() => {
    if (latitude !== undefined && longitude !== undefined) {
      return onShowOnMap(latitude, longitude);
    }
  }, [latitude, longitude, onShowOnMap]);

  return (
    <VoiceLogCard
      title={log.title}
      createdAt={log.createdAt}
      duration={log.duration}
      audioUri={log.audioUri}
      waveform={log.waveform}
      isNew={isNew}
      latitude={latitude}
      longitude={longitude}
      playback={playback}
      onPlay={handlePlay}
      onSeek={handleSeek}
      onRename={handleRename}
      onShowOnMap={handleShowOnMap}
      onDelete={handleDelete}
    />
  );
});

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
 * - Play, pause and seek saved logs (tap the waveform)
 * - Rename a log, see where it was recorded and open the Map there, delete
 *
 * @returns A React element rendering the Voice Log screen.
 */
export default observer(function VoiceLogScreen() {
  const notes = useNotesStore();
  const settings = useSettingsStore();
  const maxDurationMs = settings.voiceLogMaxSeconds * 1000;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const player = useVoiceLogPlayer();
  const { playback, toggle, seek, stop, release } = player;
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
    maxDurationMs,
    bucketMs: maxDurationMs / WAVEFORM_BARS,
    save,
    onSaved: setLastSavedId,
    // Playback would be picked up by the microphone.
    onWillStart: stop,
  });
  const { settle } = recorder;

  // Leaving mid-recording saves the recording first. The leave is held until
  // the recorder is idle again (and so no longer preventing removal);
  // dispatching it from the save callback would be blocked a second time.
  usePreventRemove(recorder.status !== 'idle', ({ data }) => {
    if (pendingLeave) return;
    stop();
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

  const handleDelete = useCallback(
    (noteId: string) => {
      Alert.alert(
        'Delete Voice Log',
        'Are you sure you want to delete this voice log?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              release(noteId);
              notes.deleteNote(noteId);
            },
          },
        ],
      );
    },
    [notes, release],
  );
  const handleRename = useCallback(
    (id: string, title: string) => notes.renameNote(id, title),
    [notes],
  );
  const handleShowOnMap = useCallback(
    async (latitude: number, longitude: number) => {
      stop();
      await settle();
      navigation.navigate('MapScreen', {
        center: { latitude, longitude },
        radiusMiles: MAP_RADIUS_MILES,
      });
    },
    [navigation, settle, stop],
  );

  return (
    <StackScreen title="Voice Logs" keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <RecordingControls
          status={recorder.status}
          elapsedMs={recorder.elapsedMs}
          maxDurationMs={maxDurationMs}
          waveform={recorder.waveform}
          waveformSlots={WAVEFORM_BARS}
          lengthOptions={VOICE_LOG_LENGTHS}
          onChangeMaxLength={settings.setVoiceLogMaxSeconds}
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
            <SavedVoiceLogCard
              key={log.id}
              log={log}
              isNew={log.id === lastSavedId}
              playback={playback?.id === log.id ? playback : undefined}
              onToggle={toggle}
              onSeek={seek}
              onRename={handleRename}
              onShowOnMap={handleShowOnMap}
              onDelete={handleDelete}
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
