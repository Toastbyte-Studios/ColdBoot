import { MenuView } from '@react-native-menu/menu';
import React, { useMemo, useState } from 'react';
import {
  AccessibilityActionEvent,
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../../components/AppButton';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme, DARK_COLORS } from '../../../theme/colors';
import { formatCoordinates } from '../../../utils/formatCoordinates';
import { formatClock, formatDateTime } from '../../../utils/timeFormat';
import Waveform from './Waveform';
import type { Playback } from '../useVoiceLogPlayer';

/** How far one screen-reader swipe moves the playhead. */
const ACCESSIBILITY_STEP_SECONDS = 2;
/** Longest name a log can be given. */
export const MAX_TITLE_LENGTH = 60;

type CardAction = 'rename' | 'map' | 'delete';

type VoiceLogCardProps = {
  title?: string;
  createdAt: number;
  /** Saved length in seconds. */
  duration?: number;
  audioUri?: string;
  /** Levels saved with the recording. Older logs have none. */
  waveform?: readonly number[];
  /** Just recorded: outlined so it's easy to spot at the top of the list. */
  isNew?: boolean;
  /** Where it was recorded, if a fix arrived. */
  latitude?: number;
  longitude?: number;
  /** Set while this log is open in the player. */
  playback?: Playback;
  onPlay: () => void;
  /** Moves the playhead, 0 to 1 (and starts the log if it isn't open). */
  onSeek: (fraction: number) => void;
  /** Saves a new name (already trimmed and non-empty). */
  onRename: (title: string) => Promise<void>;
  /** Opens the Map at the log's location. Only offered when it has one. */
  onShowOnMap: () => void;
  onDelete: () => void;
};

/**
 * A saved voice log: play or pause, its waveform (which fills in as it
 * plays and can be tapped to jump), how far in it is, and where it was
 * recorded. The More menu renames it (in place: Android has no text-input
 * alert), shows it on the map, or deletes it.
 */
export default function VoiceLogCard({
  title,
  createdAt,
  duration,
  audioUri,
  waveform,
  isNew,
  latitude,
  longitude,
  playback,
  onPlay,
  onSeek,
  onRename,
  onShowOnMap,
  onDelete,
}: VoiceLogCardProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [stripWidth, setStripWidth] = useState(0);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const displayTitle = title || 'Voice Log';
  const hasLocation =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    isFinite(latitude) &&
    isFinite(longitude);

  const isOpen = playback !== undefined;
  const isPlaying = playback?.state === 'playing';
  const isLoading = playback?.state === 'loading';
  // The file's own length once it's loaded; the saved one until then.
  const totalSec = playback?.durationSec || duration || 0;
  const positionSec = playback?.positionSec ?? 0;
  const progress =
    isOpen && totalSec > 0 ? Math.min(1, positionSec / totalSec) : undefined;
  const hasWaveform = !!waveform && waveform.length > 0;
  // Older logs have no waveform; they get a plain track while open.
  const showStrip = !!audioUri && (hasWaveform || isOpen);

  const seekTo = (fraction: number) =>
    onSeek(Math.min(1, Math.max(0, fraction)));

  const handleStripPress = (event: GestureResponderEvent) => {
    if (stripWidth > 0) seekTo(event.nativeEvent.locationX / stripWidth);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (totalSec <= 0) return;
    const step = ACCESSIBILITY_STEP_SECONDS / totalSec;
    const at = progress ?? 0;
    if (event.nativeEvent.actionName === 'increment') seekTo(at + step);
    if (event.nativeEvent.actionName === 'decrement') seekTo(at - step);
  };

  let timeText: string | null = null;
  if (isOpen) {
    timeText = `${formatClock(positionSec)} / ${formatClock(totalSec)}`;
  } else if (totalSec > 0) {
    timeText = formatClock(totalSec);
  }

  const actions = useMemo(
    () => [
      { id: 'rename', title: 'Rename', image: 'pencil' },
      ...(hasLocation
        ? [{ id: 'map', title: 'Show on map', image: 'map' }]
        : []),
      {
        id: 'delete',
        title: 'Delete',
        image: 'trash',
        attributes: { destructive: true },
      },
    ],
    [hasLocation],
  );

  const handleAction = (action: CardAction) => {
    if (action === 'rename') setDraftTitle(displayTitle);
    if (action === 'map') onShowOnMap();
    if (action === 'delete') onDelete();
  };

  const saveTitle = async () => {
    if (draftTitle === null) return;
    const next = draftTitle.trim();
    // An empty name keeps the old one rather than leaving the card blank.
    if (next === '' || next === displayTitle) {
      setDraftTitle(null);
      return;
    }
    try {
      await onRename(next);
      setDraftTitle(null);
    } catch {
      Alert.alert(
        'Rename Failed',
        'Could not rename this voice log. Please try again.',
      );
    }
  };

  let playLabel = 'Play voice log';
  if (isPlaying) playLabel = 'Pause voice log';
  else if (isOpen) playLabel = 'Resume voice log';

  return (
    <View
      style={[
        styles.container,
        cardSurface(COLORS),
        isNew && styles.isNew,
        isOpen && styles.isOpen,
      ]}
    >
      <View style={styles.content}>
        {audioUri ? (
          <View style={styles.playSlot}>
            {isLoading ? (
              <ActivityIndicator
                color={COLORS.SECONDARY_ACCENT}
                accessibilityLabel="Loading voice log"
                testID="voice-log-loading"
              />
            ) : (
              <IconButton
                name={isPlaying ? 'pause-outline' : 'play-outline'}
                size={26}
                color={COLORS.SECONDARY_ACCENT}
                accessibilityLabel={playLabel}
                onPress={onPlay}
              />
            )}
          </View>
        ) : null}
        {draftTitle !== null ? (
          <View style={styles.renameRow}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              onSubmitEditing={saveTitle}
              style={styles.input}
              maxLength={MAX_TITLE_LENGTH}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              accessibilityLabel="Voice log name"
              placeholder="Name"
              placeholderTextColor={COLORS.MUTED}
            />
            <AppButton
              label="Cancel"
              size="small"
              variant="plain"
              onPress={() => setDraftTitle(null)}
            />
            <AppButton
              label="Save"
              size="small"
              tint={COLORS.SECONDARY_ACCENT}
              onPress={saveTitle}
            />
          </View>
        ) : (
          <>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>
                {displayTitle}
                {isNew ? <Text style={styles.newTag}> · New</Text> : null}
              </Text>
              <Text style={styles.meta}>
                {formatDateTime(new Date(createdAt))}
              </Text>
              {hasLocation ? (
                <Pressable
                  onPress={onShowOnMap}
                  style={styles.location}
                  hitSlop={6}
                  accessibilityRole="link"
                  accessibilityLabel={`Recorded at ${formatCoordinates(
                    latitude,
                    longitude,
                  )}`}
                  accessibilityHint="Shows it on the map"
                  testID="voice-log-location"
                >
                  <Icon
                    name="location-outline"
                    size={12}
                    color={COLORS.SECONDARY_ACCENT}
                  />
                  <Text style={styles.locationText}>
                    {formatCoordinates(latitude, longitude)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <MenuView
              title={displayTitle}
              actions={actions}
              onPressAction={({ nativeEvent }) =>
                handleAction(nativeEvent.event as CardAction)
              }
              themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
            >
              {/* Not a Touchable: the native menu owns the tap. */}
              <View
                style={styles.more}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`More actions for ${displayTitle}`}
                accessibilityHint="Opens a menu"
                testID="voice-log-more"
              >
                <Icon
                  name="ellipsis-horizontal-outline"
                  size={22}
                  color={COLORS.PRIMARY_DARK}
                />
              </View>
            </MenuView>
          </>
        )}
      </View>

      {showStrip ? (
        <View style={styles.playbackRow}>
          <Pressable
            style={styles.strip}
            onLayout={(e: LayoutChangeEvent) =>
              setStripWidth(e.nativeEvent.layout.width)
            }
            onPress={handleStripPress}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Playback position"
            accessibilityValue={{
              text: `${formatClock(positionSec)} of ${formatClock(totalSec)}`,
            }}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
            ]}
            onAccessibilityAction={handleAccessibilityAction}
            testID="voice-log-seek"
          >
            {hasWaveform ? (
              <Waveform
                samples={waveform}
                height={28}
                color={COLORS.SECONDARY_ACCENT}
                progress={progress}
              />
            ) : (
              <View style={styles.track} pointerEvents="none">
                <View
                  style={[
                    styles.trackFill,
                    { width: `${(progress ?? 0) * 100}%` },
                  ]}
                />
              </View>
            )}
          </Pressable>
          {timeText ? <Text style={styles.time}>{timeText}</Text> : null}
        </View>
      ) : null}
      {!showStrip && timeText ? (
        <Text style={[styles.time, styles.timeAlone]}>{timeText}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
      overflow: 'hidden',
    },
    isNew: {
      borderColor: COLORS.ACCENT,
      borderWidth: 2,
    },
    isOpen: {
      borderColor: COLORS.SECONDARY_ACCENT,
      borderWidth: 2,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    playSlot: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      paddingHorizontal: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 2,
    },
    newTag: {
      color: COLORS.ACCENT,
    },
    location: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 4,
    },
    locationText: {
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      color: COLORS.SECONDARY_ACCENT,
    },
    more: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    renameRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.OUTLINE_VARIANT,
      paddingVertical: 6,
    },
    meta: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
    },
    playbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 10,
    },
    strip: {
      flex: 1,
      height: 32,
      justifyContent: 'center',
    },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.OUTLINE_VARIANT,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      backgroundColor: COLORS.SECONDARY_ACCENT,
    },
    time: {
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
    },
    timeAlone: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      marginTop: -4,
    },
  });
