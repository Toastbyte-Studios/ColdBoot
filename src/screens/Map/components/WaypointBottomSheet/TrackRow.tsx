import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../../../components/AppButton';
import { useTheme } from '../../../../hooks/useTheme';
import { Track } from '../../../../stores/TrackStore';
import { formatDistance } from './waypointGeometry';
import type { MeasurementSystem } from '../../../../stores/SettingsStore';

interface TrackRowProps {
  track: Track;
  measurementSystem: MeasurementSystem;
  onView: (track: Track) => void;
  onDelete: (id: string) => void;
}

/** Formats seconds as "Xh Xm" or "Xm Xs". */
function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/** Formats an ISO date string as a short localized date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function TrackRow({
  track,
  measurementSystem,
  onView,
  onDelete,
}: TrackRowProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(track.id),
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.meta}>
          {formatDate(track.createdAt)} ·{' '}
          {formatDistance(track.distanceMeters, measurementSystem)} ·{' '}
          {formatDuration(track.durationSeconds)}
        </Text>
      </View>
      <AppButton
        label="View"
        size="small"
        tint={COLORS.SECONDARY_ACCENT}
        onPress={() => onView(track)}
        accessibilityLabel={`View track ${track.name} on map`}
        style={styles.action}
      />
      <AppButton
        label="Delete"
        size="small"
        variant="destructive"
        onPress={confirmDelete}
        accessibilityLabel={`Delete track ${track.name}`}
        style={styles.action}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.SECONDARY_ACCENT,
    },
    info: {
      flex: 1,
      marginRight: 8,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.PRIMARY_DARK,
    },
    meta: {
      fontSize: 12,
      color: colors.SECONDARY_ACCENT,
      marginTop: 2,
    },
    action: {
      marginLeft: 6,
    },
  });
}
