import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  Marker,
  UserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../../components/AppButton';
import IconButton from '../../../components/IconButton';
import { useTheme } from '../../../hooks/useTheme';
import { Waypoint } from '../../../stores/WaypointStore';
import { SPACING } from '../../../theme/constants';
import { formatDistance } from './LibrarySheet/waypointGeometry';
import UserHeadingPuck, { USER_HEADING_IMAGES } from './UserHeadingPuck';
import type { MeasurementSystem } from '../../../stores/SettingsStore';

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export const DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

/** MapLibre vector tile style URL (OpenFreeMap Liberty). */
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * The recording HUD floats over map tiles, so its foreground is fixed white on
 * a dark scrim rather than theme-derived. Same reasoning as
 * DownloadProgressChip: the surface underneath is imagery, not app chrome.
 */
const OVERLAY_FOREGROUND = '#FFFFFF';

/**
 * Converts a latitudeDelta (degrees of latitude visible) to a MapLibre zoom level.
 * Formula: zoom = log2(360 / latitudeDelta)
 */
export function zoomFromDelta(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / latitudeDelta));
}

export type RecordingState = 'idle' | 'recording' | 'stopped';

type LatLng = { latitude: number; longitude: number };

type Props = {
  permissionStatus: LocationPermissionStatus;
  /**
   * Keep the camera centred on the user as they move (MapLibre's native
   * follow mode). Ignored without location permission.
   */
  followUser?: boolean;
  /**
   * The native follow mode ended on its own — the user panned or zoomed the
   * map — so the owner can switch its follow toggle off to match.
   */
  onFollowUserEnded?: () => void;
  /** The map settled on a new centre, after a pan, zoom or camera move. */
  onCenterChange?: (center: LatLng) => void;
  /**
   * Compass heading in degrees, for the arrow on the user's position. Null
   * until the compass reports, which shows a plain dot instead.
   */
  userHeading?: number | null;
  /** A direct user pan or zoom, including while a locate flight is in progress. */
  onUserCameraGesture?: () => void;
  locationReady: boolean;
  cameraRef: React.RefObject<CameraRef | null>;
  onMapReady?: () => void;
  onLongPressMap?: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  waypoints?: Waypoint[];
  activeWaypointId?: string | null;
  recordingState?: RecordingState;
  recordingPolylineCoords?: LatLng[];
  viewedTrackCoords?: LatLng[];
  /** Name of the saved track drawn on the map; shows a label to clear it. */
  viewedTrackName?: string | null;
  /** Clears the saved track from the map. */
  onClearViewedTrack?: () => void;
  recordingElapsed?: number;
  recordingDistance?: number;
  measurementSystem?: MeasurementSystem;
  onSaveTrack?: (name: string) => void;
  onDiscardTrack?: () => void;
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export default function MapPanel({
  permissionStatus,
  followUser = false,
  onFollowUserEnded,
  onUserCameraGesture,
  onCenterChange,
  userHeading = null,
  locationReady,
  cameraRef,
  onMapReady,
  onLongPressMap,
  waypoints = [],
  activeWaypointId = null,
  recordingState = 'idle',
  recordingPolylineCoords = [],
  viewedTrackCoords = [],
  viewedTrackName = null,
  onClearViewedTrack,
  recordingElapsed = 0,
  recordingDistance = 0,
  measurementSystem = 'metric',
  onSaveTrack,
  onDiscardTrack,
}: Props) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [saveName, setSaveName] = useState('');

  React.useEffect(() => {
    if (recordingState === 'stopped') {
      setSaveName('');
    }
  }, [recordingState]);

  const handleSave = () => {
    onSaveTrack?.(saveName);
    setSaveName('');
  };

  const handleDiscard = () => {
    setSaveName('');
    onDiscardTrack?.();
  };

  return (
    <View style={styles.mapContainer}>
      {!locationReady ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.SECONDARY_ACCENT} />
          <Text style={styles.loadingText}>Requesting location…</Text>
        </View>
      ) : (
        <>
          {permissionStatus === 'denied' && (
            <View style={styles.deniedBanner}>
              <Text style={styles.deniedText}>
                Location access denied — enable it in Settings to see your
                position.
              </Text>
            </View>
          )}
          <Map
            accessible
            accessibilityLabel="Map"
            style={styles.map}
            mapStyle={MAP_STYLE_URL}
            compass
            compassPosition={{ top: 16, right: 16 }}
            attribution
            attributionPosition={{ bottom: 8, right: 8 }}
            logo={false}
            onDidFinishLoadingMap={() => {
              onMapReady?.();
            }}
            onRegionDidChange={(event) => {
              const [longitude, latitude] = event.nativeEvent.center;
              onCenterChange?.({ latitude, longitude });
            }}
            onRegionIsChanging={(event) => {
              if (event.nativeEvent.userInteraction) {
                onUserCameraGesture?.();
              }
            }}
            onLongPress={(event) => {
              const [lng, lat] = event.nativeEvent.lngLat;
              onLongPressMap?.({ latitude: lat, longitude: lng });
            }}
          >
            {/* TODO: Scale bar — MapLibre RN v11 does not expose a built-in
                scaleBar prop on Map. Implement as a React Native overlay that
                calculates scale from zoom + center latitude using the Web
                Mercator meters-per-pixel formula, or defer to a follow-up issue. */}
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [0, 0],
                zoom: zoomFromDelta(DELTA.latitudeDelta),
              }}
              trackUserLocation={
                followUser && permissionStatus === 'granted'
                  ? 'default'
                  : undefined
              }
              onTrackUserLocationChange={(event) => {
                if (event.nativeEvent.trackUserLocation === null) {
                  onFollowUserEnded?.();
                }
              }}
            />
            <Images images={USER_HEADING_IMAGES} />
            {permissionStatus === 'granted' && (
              <UserLocation>
                <UserHeadingPuck heading={userHeading} />
              </UserLocation>
            )}
            {waypoints.map((wp) => (
              <Marker
                key={wp.id}
                id={wp.id}
                lngLat={[wp.longitude, wp.latitude]}
              >
                <View
                  accessible
                  style={[
                    styles.markerDot,
                    wp.id === activeWaypointId && styles.markerDotActive,
                  ]}
                  accessibilityLabel={`Waypoint: ${wp.name}`}
                />
              </Marker>
            ))}
            {viewedTrackCoords.length > 1 && (
              <GeoJSONSource
                id="viewed-track"
                data={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: viewedTrackCoords.map((c) => [
                      c.longitude,
                      c.latitude,
                    ]),
                  },
                  properties: {},
                }}
              >
                <Layer
                  id="viewed-track-layer"
                  type="line"
                  style={styles.viewedTrackLineStyle}
                />
              </GeoJSONSource>
            )}
            {recordingPolylineCoords.length > 1 && (
              <GeoJSONSource
                id="recording-track"
                data={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: recordingPolylineCoords.map((c) => [
                      c.longitude,
                      c.latitude,
                    ]),
                  },
                  properties: {},
                }}
              >
                <Layer
                  id="recording-track-layer"
                  type="line"
                  style={styles.recordingLineStyle}
                />
              </GeoJSONSource>
            )}
          </Map>

          {recordingState === 'recording' && (
            <View style={styles.hud}>
              <Icon
                name="stopwatch-outline"
                size={14}
                color={OVERLAY_FOREGROUND}
              />
              <Text style={styles.hudText}>
                {formatElapsed(recordingElapsed)}
              </Text>
              <Icon
                name="navigate-outline"
                size={14}
                color={OVERLAY_FOREGROUND}
                style={styles.hudSecondIcon}
              />
              <Text style={styles.hudText}>
                {formatDistance(recordingDistance, measurementSystem)}
              </Text>
            </View>
          )}

          {/* Which saved track is drawn, and the way to clear it. Bottom-left:
              the top belongs to the recording HUD, the save bar and the
              download chip, and attribution sits bottom-right. */}
          {viewedTrackName !== null && (
            <View style={styles.trackChip}>
              <Icon
                name="footsteps-outline"
                size={14}
                color={OVERLAY_FOREGROUND}
              />
              <Text style={styles.trackChipText} numberOfLines={1}>
                {viewedTrackName}
              </Text>
              <IconButton
                name="close-outline"
                size={18}
                color={OVERLAY_FOREGROUND}
                onPress={() => onClearViewedTrack?.()}
                accessibilityLabel={`Hide track ${viewedTrackName} from map`}
                style={styles.trackChipClose}
              />
            </View>
          )}

          {recordingState === 'stopped' && (
            <View style={styles.saveToolbar}>
              <TextInput
                style={styles.saveNameInput}
                placeholder="Track name (optional)"
                placeholderTextColor={COLORS.SECONDARY_ACCENT}
                value={saveName}
                onChangeText={setSaveName}
                accessibilityLabel="Track name input"
              />
              <AppButton
                label="Save"
                size="small"
                tint={COLORS.SECONDARY_ACCENT}
                onPress={handleSave}
                accessibilityLabel="Save track"
              />
              <AppButton
                label="Discard"
                size="small"
                variant="destructive"
                onPress={handleDiscard}
                accessibilityLabel="Discard track"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  const rnStyles = StyleSheet.create({
    mapContainer: {
      width: '100%',
      flex: 1,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.PRIMARY_DARK,
    },
    deniedBanner: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.ERROR,
    },
    deniedText: {
      fontSize: 13,
      textAlign: 'center',
      color: colors.PRIMARY_LIGHT,
    },
    hud: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    hudText: {
      fontSize: 13,
      fontWeight: '700',
      color: OVERLAY_FOREGROUND,
      letterSpacing: 0.5,
    },
    hudSecondIcon: {
      marginLeft: 8,
    },
    trackChip: {
      position: 'absolute',
      bottom: SPACING.sm,
      left: SPACING.sm,
      // Leave the attribution button (bottom-right) clear.
      maxWidth: '75%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: SPACING.md,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 8,
    },
    trackChipText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
      color: OVERLAY_FOREGROUND,
    },
    trackChipClose: {
      // IconButton keeps its full touch target; pull it in so the chip
      // isn't taller than it needs to be.
      marginVertical: -SPACING.xs,
    },
    saveToolbar: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.BACKGROUND,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.SECONDARY_ACCENT,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    saveNameInput: {
      flex: 1,
      fontSize: 13,
      color: colors.PRIMARY_DARK,
      paddingVertical: 4,
    },
    markerDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.SECONDARY_ACCENT,
      borderWidth: 2,
      borderColor: colors.PRIMARY_LIGHT,
    },
    markerDotActive: {
      backgroundColor: colors.ERROR,
    },
  });
  return {
    ...rnStyles,
    /** MapLibre paint style for the viewed (saved) track polyline. */
    viewedTrackLineStyle: { lineColor: colors.SECONDARY_ACCENT, lineWidth: 3 },
    /** MapLibre paint style for the active recording polyline. */
    recordingLineStyle: { lineColor: colors.ERROR, lineWidth: 3 },
  };
}
