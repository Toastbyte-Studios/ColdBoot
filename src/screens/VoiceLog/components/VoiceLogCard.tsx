import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import { COLORS } from '../../../theme';
import { formatDateTime } from '../../../utils/timeFormat';

type VoiceLogCardProps = {
  title?: string;
  createdAt: number;
  duration?: number;
  audioUri?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
};

export default function VoiceLogCard({
  title,
  createdAt,
  duration,
  audioUri,
  isPlaying,
  onPlay,
  onDelete,
}: VoiceLogCardProps) {
  return (
    <View style={[styles.container, isPlaying && styles.containerPlaying]}>
      <LinearGradient
        colors={
          isPlaying ? [COLORS.ACCENT, COLORS.ACCENT] : COLORS.BRAND_GRADIENT
        }
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.background}
      />
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.title}>{title || 'Voice Log'}</Text>
          <Text style={styles.time}>{formatDateTime(new Date(createdAt))}</Text>
          {duration ? (
            <Text style={styles.duration}>Duration: {duration}s</Text>
          ) : null}
          {isPlaying && (
            <View style={styles.playingIndicator}>
              <View style={styles.playingDot} />
              <Text style={styles.playingText}>Playing...</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {audioUri && (
            <IconButton
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={COLORS.SECONDARY_ACCENT}
              accessibilityLabel={isPlaying ? 'Stop playing' : 'Play voice log'}
              onPress={onPlay}
              style={styles.actionButton}
            />
          )}
          <IconButton
            name="trash-outline"
            size={24}
            color={COLORS.ERROR}
            accessibilityLabel="Delete voice log"
            onPress={onDelete}
            style={styles.actionButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY_ACCENT,
    marginBottom: 12,
    overflow: 'hidden',
  },
  containerPlaying: {
    borderColor: COLORS.ACCENT,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
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
