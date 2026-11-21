import React, { useMemo, useState } from 'react';
import {
  AccessibilityActionEvent,
  ActivityIndicator,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme } from '../../../theme/colors';
import { formatClock, formatDateTime } from '../../../utils/timeFormat';
import Waveform from './Waveform';
import type { Playback } from '../useVoiceLogPlayer';

/** How far one screen-reader swipe moves the playhead. */
const ACCESSIBILITY_STEP_SECONDS = 2;

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
  /** Set while this log is open in the player. */
  playback?: Playback;
  onPlay: () => void;
  /** Moves the playhead, 0 to 1 (and starts the log if it isn't open). */
  onSeek: (fraction: number) => void;
  onDelete: () => void;
};

/**
 * A saved voice log: play or pause, its waveform (which fills in as it
 * plays and can be tapped to jump), how far in it is, and delete.
 */
export default function VoiceLogCard({
  title,
  createdAt,
  duration,
  audioUri,
  waveform,
  isNew,
  playback,
  onPlay,
  onSeek,
  onDelete,
}: VoiceLogCardProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [stripWidth, setStripWidth] = useState(0);

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
              <Pressable
                style={styles.playSlot}
                onPress={onPlay}
                accessibilityRole="button"
                accessibilityLabel="Cancel loading voice log"
              >
                <ActivityIndicator
                  color={COLORS.SECONDARY_ACCENT}
                  testID="voice-log-loading"
                />
              </Pressable>
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
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {title || 'Voice Log'}
            {isNew ? <Text style={styles.newTag}> · New</Text> : null}
          </Text>
          <Text style={styles.meta}>{formatDateTime(new Date(createdAt))}</Text>
        </View>
        <IconButton
          name="trash-outline"
          size={22}
          color={COLORS.ERROR}
          accessibilityLabel="Delete voice log"
          onPress={onDelete}
        />
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
