import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  useCurrentPosition,
  type CameraRef,
  type InitialViewState,
  type OfflinePack,
} from '@maplibre/maplibre-react-native';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../../../components/AppButton';
import AppSwitch from '../../../../components/AppSwitch';
import SegmentedControl from '../../../../components/SegmentedControl';
import { useTheme } from '../../../../hooks/useTheme';
import {
  DEFAULT_OFFLINE_ZOOM,
  HIGH_DETAIL_OFFLINE_ZOOM,
  OfflineMapService,
} from '../../../../navigation/services/OfflineMapService';
import { boundsFromRadius } from '../../../../navigation/utils/boundsFromRadius';
import { boundsToGeoJSON } from '../../../../navigation/utils/boundsToGeoJSON';
import { formatBytes } from '../../../../navigation/utils/formatBytes';
import { useSettingsStore } from '../../../../stores';
import { useOfflineDownloadStore } from '../../../../stores/StoreContext';
import { createOfflineRegionWithSmartName } from './offlinePackNaming';

const RETRY_TIMEOUT_MS = 15_000;
const FREE_DISK_BUFFER_BYTES = 500 * 1024 * 1024; // 500 MB safety margin
/** Area sizes on offer, as a radius in miles (what pack metadata stores). */
const RADIUS_OPTIONS_MILES = [10, 25, 50] as const;
type RadiusMiles = (typeof RADIUS_OPTIONS_MILES)[number];
/** The size before this choice existed; a default that keeps that behaviour. */
const DEFAULT_RADIUS_MILES: RadiusMiles = 50;

const KM_PER_MILE = 1.609344;

/** "25 mi", or "40 km" for metric users. The radius itself stays in miles. */
function formatRadius(
  miles: number,
  system: 'imperial' | 'metric' | undefined,
): string {
  return system === 'metric'
    ? `${Math.round(miles * KM_PER_MILE)} km`
    : `${miles} mi`;
}

/** Room around the area box when the preview fits it. */
const PREVIEW_PADDING = { top: 16, right: 16, bottom: 16, left: 16 };
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Where the area is centred: the user's GPS fix, or a point they pan to. */
type AreaMode = 'nearby' | 'custom';

const AREA_OPTIONS: { value: AreaMode; label: string }[] = [
  { value: 'nearby', label: 'Around me' },
  { value: 'custom', label: 'Choose on map' },
];

type LatLng = { latitude: number; longitude: number };

/**
 * Where "Choose on map" opens without a GPS fix: the contiguous US, zoomed
 * out to pan from. Offline-pack size estimates are US-only, see
 * OfflineMapService.
 */
const FALLBACK_CENTER: LatLng = { latitude: 39.83, longitude: -98.58 };
const FALLBACK_ZOOM = 3.5;

type Props = {
  onDismiss: () => void;
};

/**
 * Modal sheet for confirming an offline map download.
 * Navigation: registered as a modal route on AppNavigator;
 * dismiss via onDismiss (which calls navigation.goBack()).
 *
 * The "High detail" toggle is backed by the persisted app setting
 * (`SettingsStore.highDetailOffline`) so the choice carries across downloads
 * and matches the toggle surfaced in Settings.
 */
function DownloadConfirmScreen({ onDismiss }: Props) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const settingsStore = useSettingsStore();
  const fillLayerStyle = useMemo(
    () => ({ fillColor: COLORS.SECONDARY_ACCENT, fillOpacity: 0.2 }),
    [COLORS.SECONDARY_ACCENT],
  );
  const lineLayerStyle = useMemo(
    () => ({ lineColor: COLORS.SECONDARY_ACCENT, lineWidth: 2 }),
    [COLORS.SECONDARY_ACCENT],
  );
  const store = useOfflineDownloadStore();
  const navigation = useNavigation();

  const [mode, setMode] = useState<AreaMode>('nearby');
  /** Centre of the "Choose on map" area: the preview map's centre. */
  const [customCenter, setCustomCenter] = useState<LatLng | null>(null);
  /** Where the "Choose on map" preview opens; fixed so panning isn't reset. */
  const [customStartView, setCustomStartView] =
    useState<InitialViewState | null>(null);
  const [radiusMiles, setRadiusMiles] =
    useState<RadiusMiles>(DEFAULT_RADIUS_MILES);
  const cameraRef = useRef<CameraRef>(null);
  /** A finger is on the pannable preview, so the page mustn't scroll. */
  const [mapTouched, setMapTouched] = useState(false);

  const mlPosition = useCurrentPosition();
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highDetail = settingsStore.highDetailOffline;
  const zoomRange = highDetail
    ? HIGH_DETAIL_OFFLINE_ZOOM
    : DEFAULT_OFFLINE_ZOOM;

  const [storagePressure, setStoragePressure] = useState(false);
  const [starting, setStarting] = useState(false);

  // Wait for GPS fix; time out after RETRY_TIMEOUT_MS
  useEffect(() => {
    if (mlPosition && !gpsReady) {
      setGpsReady(true);
      setGpsTimedOut(false);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    }
  }, [mlPosition, gpsReady]);

  const startRetryTimer = useCallback(() => {
    setGpsTimedOut(false);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (!mlPosition) setGpsTimedOut(true);
    }, RETRY_TIMEOUT_MS);
  }, [mlPosition]);

  useEffect(() => {
    startRetryTimer();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [startRetryTimer]);

  const coords = mlPosition?.coords;
  const center: LatLng | null =
    mode === 'custom'
      ? customCenter
      : coords
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : null;
  const centerLat = center?.latitude;
  const centerLng = center?.longitude;
  const bounds = useMemo(
    () =>
      centerLat !== undefined && centerLng !== undefined
        ? boundsFromRadius(
            { longitude: centerLng, latitude: centerLat },
            radiusMiles,
          )
        : null,
    [centerLat, centerLng, radiusMiles],
  );

  // A new size refits the preview around the same centre. (The first fit is
  // each preview's initialViewState.)
  const fittedRadiusRef = useRef<number>(radiusMiles);
  useEffect(() => {
    if (fittedRadiusRef.current === radiusMiles || !bounds) {
      return;
    }
    fittedRadiusRef.current = radiusMiles;
    cameraRef.current
      ?.setStop({ bounds, padding: PREVIEW_PADDING, duration: 300 })
      ?.catch(() => {});
  }, [bounds, radiusMiles]);

  // Panning the preview would also drag the modal down to dismiss it.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: mode !== 'custom' });
  }, [mode, navigation]);

  const handleModeChange = useCallback(
    (next: AreaMode) => {
      if (next === 'custom' && !customStartView) {
        if (coords) {
          const start = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          setCustomStartView({
            bounds: boundsFromRadius(start, radiusMiles),
            padding: PREVIEW_PADDING,
          });
          setCustomCenter(start);
        } else {
          setCustomStartView({
            center: [FALLBACK_CENTER.longitude, FALLBACK_CENTER.latitude],
            zoom: FALLBACK_ZOOM,
          });
          setCustomCenter(FALLBACK_CENTER);
        }
      }
      setMode(next);
    },
    [coords, customStartView, radiusMiles],
  );

  const estimatedBytes = useMemo(
    () =>
      bounds
        ? OfflineMapService.estimateDownloadBytes({ bounds, zoomRange })
        : 0,
    [bounds, zoomRange],
  );

  const boundsGeoJSON = useMemo(
    () => (bounds ? boundsToGeoJSON(bounds) : null),
    [bounds],
  );

  // Storage pressure check whenever estimate changes
  useEffect(() => {
    if (estimatedBytes === 0) return;
    let ignore = false;
    DeviceInfo.getFreeDiskStorage().then((freeBytes) => {
      if (ignore) return;
      setStoragePressure(estimatedBytes > freeBytes - FREE_DISK_BUFFER_BYTES);
    });
    return () => {
      ignore = true;
    };
  }, [estimatedBytes]);

  const handleDownload = useCallback(async () => {
    if (!bounds || centerLat === undefined || centerLng === undefined) return;
    if (starting) return;
    setStarting(true);
    try {
      const pack = await createOfflineRegionWithSmartName({
        bounds,
        centerLat,
        centerLng,
        radiusMiles,
        zoomRange,
        onProgress: (p, s) => store.handleProgress(p, s),
        onError: (p, e) => store.handleError(p, e),
      });
      store.start(pack);
      onDismiss();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start download';
      store.handleError({ id: '' } as unknown as OfflinePack, { message: msg });
      onDismiss();
    }
  }, [
    bounds,
    centerLat,
    centerLng,
    radiusMiles,
    zoomRange,
    store,
    starting,
    onDismiss,
  ]);

  const measurementSystem = settingsStore.measurementSystem;
  const radiusOptions = useMemo(
    () =>
      RADIUS_OPTIONS_MILES.map((miles) => ({
        value: String(miles),
        label: formatRadius(miles, measurementSystem),
      })),
    [measurementSystem],
  );
  const radiusLabel = formatRadius(radiusMiles, measurementSystem);

  const boundsLayers = boundsGeoJSON && (
    <GeoJSONSource id="download-bounds" data={boundsGeoJSON}>
      <Layer id="download-bounds-fill" type="fill" style={fillLayerStyle} />
      <Layer id="download-bounds-line" type="line" style={lineLayerStyle} />
    </GeoJSONSource>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Download an area</Text>
        <AppButton
          label="Cancel"
          variant="plain"
          size="small"
          tint={COLORS.SECONDARY_ACCENT}
          onPress={onDismiss}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!mapTouched}
      >
        <SegmentedControl
          options={AREA_OPTIONS}
          value={mode}
          onChange={handleModeChange}
          accessibilityLabel="Area to download"
        />

        {/* Map preview */}
        {mode === 'custom' && customStartView ? (
          <View
            style={styles.mapContainer}
            // Keep the page still while the preview is being panned: on
            // Android the scroll view would otherwise take vertical drags.
            onTouchStart={() => setMapTouched(true)}
            onTouchEnd={() => setMapTouched(false)}
            onTouchCancel={() => setMapTouched(false)}
          >
            <Map
              key="custom"
              style={styles.map}
              mapStyle={MAP_STYLE_URL}
              logo={false}
              attribution={false}
              accessibilityLabel="Area to download. Pan and zoom to centre it."
              onRegionDidChange={(event) => {
                const [longitude, latitude] = event.nativeEvent.center;
                setCustomCenter({ latitude, longitude });
              }}
            >
              <Camera ref={cameraRef} initialViewState={customStartView} />
              {boundsLayers}
            </Map>
            {/* The area is centred here; the box catches up when the pan
                ends. */}
            <View style={styles.crosshair} pointerEvents="none">
              <Icon
                name="add-outline"
                size={28}
                color={COLORS.SECONDARY_ACCENT}
              />
            </View>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            {!gpsReady ? (
              <View style={styles.gpsWaiting}>
                {gpsTimedOut ? (
                  <>
                    <Text style={styles.gpsText}>GPS fix timed out</Text>
                    <AppButton
                      label="Retry"
                      variant="plain"
                      size="small"
                      tint={COLORS.SECONDARY_ACCENT}
                      onPress={startRetryTimer}
                      accessibilityLabel="Retry waiting for a GPS fix"
                    />
                  </>
                ) : (
                  <>
                    <ActivityIndicator color={COLORS.SECONDARY_ACCENT} />
                    <Text style={styles.gpsText}>Waiting for GPS…</Text>
                  </>
                )}
                <AppButton
                  label="Choose on map instead"
                  variant="plain"
                  size="small"
                  tint={COLORS.SECONDARY_ACCENT}
                  onPress={() => handleModeChange('custom')}
                />
              </View>
            ) : (
              <Map
                key="nearby"
                style={styles.map}
                mapStyle={MAP_STYLE_URL}
                logo={false}
                attribution={false}
              >
                {bounds && (
                  <Camera
                    ref={cameraRef}
                    initialViewState={{ bounds, padding: PREVIEW_PADDING }}
                  />
                )}
                {boundsLayers}
              </Map>
            )}
          </View>
        )}

        {/* Area size */}
        <View style={styles.sizeRow}>
          <Text style={styles.label}>Area size</Text>
          <SegmentedControl
            options={radiusOptions}
            value={String(radiusMiles)}
            onChange={(value) => setRadiusMiles(Number(value) as RadiusMiles)}
            accessibilityLabel="Area size, as a radius"
            style={styles.sizeControl}
          />
        </View>

        {/* Storage pressure warning */}
        {storagePressure && (
          <View style={styles.warningBanner}>
            <Icon name="warning-outline" size={16} color={WARNING_FOREGROUND} />
            <Text style={styles.warningText}>
              Low storage — this download may not fit. Free up space before
              continuing.
            </Text>
          </View>
        )}

        {/* Detail toggle */}
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.label}>High detail (z8–14)</Text>
            <Text style={styles.hint}>
              Includes building detail. ~2× storage.
            </Text>
          </View>
          <AppSwitch
            value={highDetail}
            onValueChange={(value) => settingsStore.setHighDetailOffline(value)}
            tint={COLORS.SECONDARY_ACCENT}
            accessibilityLabel="Toggle high detail"
          />
        </View>

        {/* Estimate */}
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>Estimated size</Text>
          <Text style={styles.estimateValue}>
            {bounds ? formatBytes(estimatedBytes) : '—'}
          </Text>
        </View>

        <Text style={styles.radiusNote}>
          {mode === 'custom'
            ? `Covers a ~${radiusLabel} radius around the crosshair · pan and zoom to move it · works in airplane mode`
            : `Covers a ~${radiusLabel} radius around your current location · works in airplane mode`}
        </Text>

        {/* Download button */}
        <AppButton
          label="Download"
          size="large"
          tint={COLORS.SECONDARY_ACCENT}
          fullWidth
          disabled={!bounds}
          loading={starting}
          onPress={handleDownload}
          accessibilityLabel="Start download"
          style={styles.downloadBtn}
        />
      </ScrollView>
    </View>
  );
}

export default observer(DownloadConfirmScreen);

/**
 * The low-storage banner is a fixed amber warning rather than a theme color:
 * there is no warning token in the palette. See docs/NATIVE_REDESIGN.md.
 */
const WARNING_FOREGROUND = '#664D03';

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.SECONDARY_ACCENT,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.PRIMARY_DARK,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 16,
    },
    mapContainer: {
      height: 220,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.SECONDARY_ACCENT,
    },
    map: {
      flex: 1,
    },
    sizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sizeControl: {
      flex: 1,
    },
    crosshair: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gpsWaiting: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    gpsText: {
      fontSize: 14,
      color: colors.PRIMARY_DARK,
    },
    warningBanner: {
      backgroundColor: '#FFF3CD',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#FFCA2C',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: WARNING_FOREGROUND,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    rowLabel: {
      flex: 1,
      marginRight: 12,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.PRIMARY_DARK,
    },
    hint: {
      fontSize: 12,
      color: colors.SECONDARY_ACCENT,
      marginTop: 2,
    },
    estimateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    estimateLabel: {
      fontSize: 15,
      color: colors.PRIMARY_DARK,
    },
    estimateValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.PRIMARY_DARK,
    },
    radiusNote: {
      fontSize: 12,
      color: colors.SECONDARY_ACCENT,
      textAlign: 'center',
    },
    downloadBtn: {
      marginTop: 8,
    },
  });
}
