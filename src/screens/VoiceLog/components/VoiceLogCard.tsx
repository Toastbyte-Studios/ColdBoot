import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme } from '../../../theme/colors';
import { onColor } from '../../../theme/colorUtils';
import { formatDateTime } from '../../../utils/timeFormat';

type VoiceLogCardProps = {
  title?: string;
  createdAt: number;
  duration?: number;
  audioUri?: string;
  /** Just recorded: outlined so it's easy to spot at the top of the list. */
  isNew?: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
};

export default function VoiceLogCard({
  title,
  createdAt,
  duration,
  audioUri,
  isNew,
  isPlaying,
  onPlay,
  onDelete,
}: VoiceLogCardProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const accentForeground = onColor(COLORS.ACCENT);
  // While playing the card fills with ACCENT, so its content colour is
  // measured against that fill rather than assumed.
  const onPlaying = isPlaying ? { color: accentForeground } : null;

  return (
    <View
      style={[
        styles.container,
        cardSurface(COLORS),
        isNew && styles.isNew,
        isPlaying && {
          backgroundColor: COLORS.ACCENT,
          borderColor: COLORS.ACCENT,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.title, onPlaying]}>
            {title || 'Voice Log'}
            {isNew && !isPlaying ? (
              <Text style={styles.newTag}> · New</Text>
            ) : null}
          </Text>
          <Text style={[styles.time, onPlaying]}>
            {formatDateTime(new Date(createdAt))}
          </Text>
          {duration ? (
            <Text style={[styles.duration, onPlaying]}>
              Duration: {duration}s
            </Text>
          ) : null}
          {isPlaying && (
            <View style={styles.playingIndicator}>
              <View
                style={[
                  styles.playingDot,
                  { backgroundColor: accentForeground },
                ]}
              />
              <Text style={[styles.playingText, onPlaying]}>Playing...</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {audioUri && (
            <IconButton
              name={isPlaying ? 'pause-outline' : 'play-outline'}
              size={24}
              color={isPlaying ? accentForeground : COLORS.SECONDARY_ACCENT}
              accessibilityLabel={isPlaying ? 'Stop playing' : 'Play voice log'}
              onPress={onPlay}
              style={styles.actionButton}
            />
          )}
          <IconButton
            name="trash-outline"
            size={24}
            color={isPlaying ? accentForeground : COLORS.ERROR}
            accessibilityLabel="Delete voice log"
            onPress={onDelete}
            style={styles.actionButton}
          />
        </View>
      </View>
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
    content: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 4,
    },
    newTag: {
      color: COLORS.ACCENT,
    },
    time: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
      marginBottom: 4,
    },
    duration: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
      marginBottom: 4,
    },
    playingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    playingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.SECONDARY_ACCENT,
      marginRight: 6,
    },
    playingText: {
      fontSize: 12,
      color: COLORS.SECONDARY_ACCENT,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      marginLeft: 8,
    },
  });
