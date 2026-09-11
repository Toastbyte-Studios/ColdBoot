/**
 * WaypointBottomSheet — Animated bottom sheet that slides up over the map.
 * Uses Animated + PanResponder (no Modal) so the map remains visible above.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppButton from '../../../../components/AppButton';
import IconButton from '../../../../components/IconButton';
import SegmentedControl from '../../../../components/SegmentedControl';
import { useTheme } from '../../../../hooks/useTheme';
import { useSettingsStore } from '../../../../stores/StoreContext';
import { Track } from '../../../../stores/TrackStore';
import { Waypoint } from '../../../../stores/WaypointStore';
import AddWaypointForm from './AddWaypointForm';
import TrackRow from './TrackRow';
import WaypointRow from './WaypointRow';

// ---------- constants -------------------------------------------------------

const WINDOW_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(WINDOW_HEIGHT * 0.45);
const HANDLE_HEIGHT = 28;

// ---------- types -----------------------------------------------------------

type SheetState = 'closed' | 'open';
type ActiveTab = 'waypoints' | 'tracks';

const TAB_OPTIONS: { value: ActiveTab; label: string }[] = [
  { value: 'waypoints', label: 'Waypoints' },
  { value: 'tracks', label: 'Tracks' },
];

interface Coords {
  latitude: number;
  longitude: number;
}

export interface WaypointBottomSheetProps {
  /** All saved waypoints. */
  waypoints: Waypoint[];
  /** All saved tracks. */
  tracks?: Track[];
  /** Current GPS coords of the device (used for live distance/bearing in rows). */
  currentCoords: Coords | null;
  /** Whether the sheet is open (controlled externally via the FAB). */
  isOpen: boolean;
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
}

// ---------- component -------------------------------------------------------

export default function WaypointBottomSheet({
  waypoints,
  tracks = [],
  currentCoords,
  isOpen,
  onClose,
  onNavigate,
  onDelete,
  onAddFromLocation,
  onAddManual,
  containerHeight,
  onViewTrack,
  onDeleteTrack,
}: WaypointBottomSheetProps) {
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('waypoints');

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

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setShowAddForm(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, snapOpen, translateY]);

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
          accessibilityLabel="Show waypoints or tracks"
          style={styles.tabs}
        />

        <View style={styles.headerActions}>
          {activeTab === 'waypoints' && !showAddForm && (
            <AppButton
              label="Add"
              icon="add-outline"
              size="small"
              tint={COLORS.SECONDARY_ACCENT}
              onPress={() => setShowAddForm(true)}
              accessibilityLabel="Add waypoint"
            />
          )}
          {!showAddForm && (
            <IconButton
              name="close-outline"
              size={20}
              accessibilityLabel="Close waypoints sheet"
              onPress={onClose}
            />
          )}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'waypoints' ? (
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
                  No waypoints saved. Add one to get started.
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
    // The segmented control has no intrinsic width; take the space the header
    // actions leave.
    tabs: {
      flex: 1,
      marginRight: 12,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
