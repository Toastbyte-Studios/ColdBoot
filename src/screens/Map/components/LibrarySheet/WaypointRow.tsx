import { MenuView } from '@react-native-menu/menu';
import React, { useMemo } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../../../components/AppButton';
import { useTheme } from '../../../../hooks/useTheme';
import { Waypoint } from '../../../../stores/WaypointStore';
import { DARK_COLORS } from '../../../../theme/colors';
import {
  bearingDegrees,
  formatBearing,
  formatDistance,
  haversineMeters,
} from './waypointGeometry';
import type { MeasurementSystem } from '../../../../stores/SettingsStore';

interface Coords {
  latitude: number;
  longitude: number;
}

/** Matches IconButton's touch target. */
const TARGET = Platform.OS === 'ios' ? 44 : 48;

type WaypointAction = 'download' | 'delete';

interface WaypointRowProps {
  waypoint: Waypoint;
  currentCoords: Coords | null;
  measurementSystem: MeasurementSystem;
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
  /** Downloads an offline area centred on this waypoint. */
  onDownloadArea?: (center: Coords) => void;
}

export default function WaypointRow({
  waypoint,
  currentCoords,
  measurementSystem,
  onNavigate,
  onDelete,
  onDownloadArea,
}: WaypointRowProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const distanceLabel = currentCoords
    ? formatDistance(
        haversineMeters(
          currentCoords.latitude,
          currentCoords.longitude,
          waypoint.latitude,
          waypoint.longitude,
        ),
        measurementSystem,
      )
    : '—';

  const bearingLabel = currentCoords
    ? formatBearing(
        bearingDegrees(
          currentCoords.latitude,
          currentCoords.longitude,
          waypoint.latitude,
          waypoint.longitude,
        ),
      )
    : '—';

  const menuActions = useMemo(
    () => [
      ...(onDownloadArea
        ? [
            {
              id: 'download',
              title: 'Download area here',
              image: 'arrow.down.circle',
            },
          ]
        : []),
      {
        id: 'delete',
        title: 'Delete',
        image: 'trash',
        attributes: { destructive: true },
      },
    ],
    [onDownloadArea],
  );

  const confirmDelete = () => {
    Alert.alert(
      'Delete Waypoint',
      `Are you sure you want to delete "${waypoint.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(waypoint.id),
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {waypoint.name}
        </Text>
        <Text style={styles.meta}>
          {distanceLabel} · {bearingLabel}
        </Text>
      </View>
      <AppButton
        label="Navigate"
        size="small"
        tint={COLORS.SECONDARY_ACCENT}
        onPress={() => onNavigate(waypoint.id)}
        accessibilityLabel={`Navigate to ${waypoint.name}`}
        style={styles.action}
      />
      {/* Less frequent actions sit behind a menu, like the Maps tab's rows,
          so the row stays on one line. */}
      <MenuView
        title={waypoint.name}
        actions={menuActions}
        onPressAction={({ nativeEvent }) => {
          const action = nativeEvent.event as WaypointAction;
          if (action === 'download') {
            onDownloadArea?.({
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            });
          } else if (action === 'delete') {
            confirmDelete();
          }
        }}
        themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
      >
        {/* Not a Touchable: the native menu owns the tap. */}
        <View
          style={styles.trailing}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${waypoint.name}`}
          accessibilityHint="Opens a menu"
        >
          <Icon
            name="ellipsis-horizontal-circle-outline"
            size={22}
            color={COLORS.SECONDARY_ACCENT}
          />
        </View>
      </MenuView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingLeft: 16,
      paddingRight: 8,
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
    trailing: {
      width: TARGET,
      height: TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
