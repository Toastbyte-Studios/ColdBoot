/**
 * LibrarySheet — everything saved for the map, in one place: waypoints,
 * recorded tracks and downloaded offline areas, one tab each.
 * Uses Animated + PanResponder (no Modal) so the map remains visible above.
 */

import { useFocusEffect } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  BackHandler,
  Dimensions,
  Keyboard,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SegmentedControl from '../../../../components/SegmentedControl';
import { useTheme } from '../../../../hooks/useTheme';
import { useSettingsStore } from '../../../../stores/StoreContext';
import { Track } from '../../../../stores/TrackStore';
import { Waypoint } from '../../../../stores/WaypointStore';
import AddWaypointForm from './AddWaypointForm';
import MapsTab from './MapsTab';
import TrackRow from './TrackRow';
import WaypointRow from './WaypointRow';
import type { PackRegion } from '../../../../utils/offlinePacks';

// ---------- constants -------------------------------------------------------

const WINDOW_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(WINDOW_HEIGHT * 0.45);
const HANDLE_HEIGHT = 28;

// ---------- types -----------------------------------------------------------

type SheetState = 'closed' | 'open';
export type LibraryTab = 'waypoints' | 'tracks' | 'maps';
/** Where the sheet can open: a tab, or straight into a new waypoint's form. */
export type LibraryOpenTarget = LibraryTab | 'new-waypoint';

const TAB_OPTIONS: { value: LibraryTab; label: string }[] = [
  { value: 'waypoints', label: 'Waypoints' },
  { value: 'tracks', label: 'Tracks' },
  { value: 'maps', label: 'Maps' },
];

interface Coords {
  latitude: number;
  longitude: number;
}

export interface LibrarySheetProps {
  /** All saved waypoints. */
  waypoints: Waypoint[];
  /** All saved tracks. */
  tracks?: Track[];
  /** Current GPS coords of the device (used for live distance/bearing in rows). */
  currentCoords: Coords | null;
  /** Whether the sheet is open (controlled by the map's Library button). */
  isOpen: boolean;
  /**
   * Where to open: a tab, e.g. 'maps' when Settings links to offline maps, or
   * 'new-waypoint' for the map's flag button. Left out, the sheet keeps
   * whichever tab was showing last.
   */
  openTab?: LibraryOpenTarget;
  /**
   * Bumped by the owner on every request to open on `openTab`, so asking for
   * the same target twice (the flag pressed again) still applies it.
   */
  openRequestId?: number;
  /** Called when the user closes the sheet via button or swipe. */
  onClose: () => void;
  /** Called when user taps Navigate on a waypoint. */
  onNavigate: (id: string) => void;
  /** Called when user taps Delete on a waypoint. */
  onDelete: (id: string) => void;
  /** Called when user wants to add a waypoint from current location. */
  onAddFromLocation: (name: string) => void;
  /** Called when user manually enters coordinates. */
  onAddManual: (name: string, latitude: number, longitude: number) => void;
  /**
   * Height of the parent map container (from onLayout).
   * Sheet height is capped to 85% of this so it never overflows the map area.
   */
  containerHeight?: number;
  /** @deprecated No longer used — kept to satisfy stale TS cache. */
  activeWaypointId?: string | null;
  /** @deprecated No longer used — kept to satisfy stale TS cache. */
  onDismissActive?: () => void;
  /** Called when the user taps View on a saved track. */
  onViewTrack?: (track: Track) => void;
  /** Called when the user taps Delete on a saved track. */
  onDeleteTrack?: (id: string) => void;
  /** Called when the user taps View on a downloaded offline area. */
  onViewRegion: (region: PackRegion) => void;
  /** Called when the user wants to download a new offline area (Maps tab). */
  onDownloadArea: () => void;
}

// ---------- component -------------------------------------------------------

export default function LibrarySheet({
  waypoints,
  tracks = [],
  currentCoords,
  isOpen,
  openTab,
  openRequestId,
  onClose,
  onNavigate,
  onDelete,
  onAddFromLocation,
  onAddManual,
  containerHeight,
  onViewTrack,
  onDeleteTrack,
  onViewRegion,
  onDownloadArea,
}: LibrarySheetProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const settingsStore = useSettingsStore();
  const measurementSystem = settingsStore.measurementSystem;

  // Cap sheet height to 85% of the map container so it never overflows.
  // Falls back to the window-based constant when containerHeight is not yet measured.
  const sheetHeight =
    containerHeight && containerHeight > 0
      ? Math.min(SHEET_HEIGHT, Math.round(containerHeight * 0.85))
      : SHEET_HEIGHT;

  // Mutable ref so the PanResponder closure (created once) can read the latest value.
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;

  const [sheetState, setSheetState] = useState<SheetState>('closed');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>('waypoints');

  // translateY: 0 = fully visible, positive = hidden below the container
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const snapOpen = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [translateY]);

  const handleTabChange = useCallback((tab: LibraryTab) => {
    setActiveTab(tab);
    setShowAddForm(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (openTab === 'new-waypoint') {
        setActiveTab('waypoints');
        setShowAddForm(true);
      } else if (openTab) {
        setActiveTab(openTab);
        setShowAddForm(false);
      }
      setSheetState('open');
      snapOpen();
    } else {
      setShowAddForm(false);
      // Use timing (not spring) so there is no overshoot/bounce at the end.
      // After sliding off-screen, unmount the sheet entirely.
      Animated.timing(translateY, {
        toValue: sheetHeightRef.current,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setSheetState('closed');
        }
      });
    }
  }, [isOpen, openTab, openRequestId, snapOpen, translateY]);

  // There's no close button: the sheet is dragged down. Android's back
  // gesture closes it first, as it does any bottom sheet, rather than leaving
  // the map screen behind it.
  useFocusEffect(
    useCallback(() => {
      if (!isOpen) {
        return;
      }
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onClose();
          return true;
        },
      );
      return () => subscription.remove();
    }, [isOpen, onClose]),
  );

  // Screen readers can't drag the handle; VoiceOver's escape gesture (and
  // TalkBack's equivalent action) closes the sheet instead.
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'escape') {
        onClose();
      }
    },
    [onClose],
  );

  // PanResponder for drag-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dy) > 8,
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.spring(translateY, {
            toValue: sheetHeightRef.current,
            useNativeDriver: true,
            speed: 18,
            bounciness: 0,
          }).start(() => onClose());
        } else {
          snapOpen();
        }
      },
    }),
  ).current;

  const handleAddFromLocation = (name: string) => {
    setShowAddForm(false);
    Keyboard.dismiss();
    onAddFromLocation(name);
  };

  const handleAddManual = (
    name: string,
    latitude: number,
    longitude: number,
  ) => {
    setShowAddForm(false);
    Keyboard.dismiss();
    onAddManual(name, latitude, longitude);
  };

  if (sheetState === 'closed') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.sheet,
        { height: sheetHeight, transform: [{ translateY }] },
      ]}
      pointerEvents={isOpen ? 'auto' : 'none'}
      accessibilityViewIsModal={false}
      accessibilityActions={[{ name: 'escape', label: 'Close library' }]}
      onAccessibilityAction={handleAccessibilityAction}
      onAccessibilityEscape={onClose}
    >
      {/* Drag handle */}
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <SegmentedControl
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={handleTabChange}
          accessibilityLabel="Show waypoints, tracks or offline maps"
          style={styles.tabs}
        />
      </View>

      {/* Tab content */}
      {activeTab === 'maps' ? (
        <MapsTab onViewRegion={onViewRegion} onDownload={onDownloadArea} />
      ) : activeTab === 'waypoints' ? (
        showAddForm ? (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScrollContent}
          >
            <AddWaypointForm
              hasLocation={currentCoords !== null}
              onAddFromLocation={handleAddFromLocation}
              onAddManual={handleAddManual}
              onCancel={() => setShowAddForm(false)}
            />
          </ScrollView>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {waypoints.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No waypoints yet. Tap the flag above the map, or press and
                  hold on the map, to save one.
                </Text>
              </View>
            ) : (
              waypoints.map((wp) => (
                <WaypointRow
                  key={wp.id}
                  waypoint={wp}
                  currentCoords={currentCoords}
                  measurementSystem={measurementSystem}
                  onNavigate={onNavigate}
                  onDelete={onDelete}
                />
              ))
            )}
          </ScrollView>
        )
      ) : (
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {tracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No tracks saved. Record a trail to get started.
              </Text>
            </View>
          ) : (
            tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                measurementSystem={measurementSystem}
                onView={(t) => onViewTrack?.(t)}
                onDelete={(id) => onDeleteTrack?.(id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ---------- styles ----------------------------------------------------------

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.BACKGROUND,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.SECONDARY_ACCENT,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 8,
      overflow: 'hidden',
    },
    handleArea: {
      height: HANDLE_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.SECONDARY_ACCENT,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    // The segmented control has no intrinsic width; it takes the whole row.
    tabs: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    formScrollContent: {
      flexGrow: 1,
    },
    emptyState: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.SECONDARY_ACCENT,
      textAlign: 'center',
    },
  });
}
