import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import InfoBlock from '../../components/InfoBlock';
import ModuleRow from '../../components/ModuleRow';
import ScreenBody from '../../components/ScreenBody';
import SectionEyebrow from '../../components/SectionEyebrow';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { useScreenHeader } from '../../navigation/ScreenHeaderContext';
import { usePantryStore } from '../../stores';
import {
  RADIUS,
  ROW_MIN_HEIGHT,
  SCREEN_GUTTER,
  SCREEN_INSET,
  SPACING,
} from '../../theme';
import { normalizeBarcode } from '../../utils/barcode';
import { PantryScanCamera } from './scan/PantryScanCamera';
import {
  ScanEntry,
  ScanGate,
  reconcileAddedItem,
  recordScan,
  scanEntryKey,
  undoScan,
} from './scan/pantryScanSession';
import type { PantryItem } from '../../stores/PantryStore';

const CAMERA_HEIGHT = 240;
const MIN_CAMERA_HEIGHT = 96;

/**
 * False once the app goes to the background, so the camera stops. Any other
 * state counts as foreground: iOS pauses the camera itself while `inactive`
 * (the app switcher, Control Centre), and the state can read `unknown` at
 * launch.
 */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setActive(state !== 'background'),
    );
    return () => subscription.remove();
  }, []);
  return active;
}

function quantityLabel(item: PantryItem): string {
  return item.unit ? `${item.quantity} ${item.unit}` : `${item.quantity}`;
}

/**
 * Scan barcodes to stock the pantry.
 *
 * @remarks
 * - A product already in the pantry goes up by one per scan. The same can
 *   held in view counts once; it has to leave the frame to count again.
 * - An unknown code waits in the list with its scan count. Tapping it picks
 *   a category and opens Add Pantry Item with the barcode and count filled
 *   in.
 * - Tapping a counted row offers to take one back or open the item.
 *
 * Everything happens on the phone: no product lookup yet.
 *
 * Keeps the camera outside the scrolling list so the preview stays in place
 * while the list of scans scrolls beneath it.
 * Scanning is iOS-only for now; see `PantryScanCamera`.
 */
export default observer(function PantryScanScreen() {
  useScreenHeader({ title: 'Scan to Pantry' });
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pantry = usePantryStore();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const footerClearance = useFooterClearance();

  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [gate] = useState(() => new ScanGate());
  const entriesRef = useRef(entries);
  const pausedRef = useRef(false);
  const pendingAdjustments = useRef(new Set<Promise<void>>());
  const [frameHeight, setFrameHeight] = useState(0);
  const [headerDetailsHeight, setHeaderDetailsHeight] = useState(0);

  const updateEntries = useCallback(
    (update: (current: ScanEntry[]) => ScanEntry[]) => {
      const next = update(entriesRef.current);
      entriesRef.current = next;
      setEntries(next);
    },
    [],
  );

  const settleAdjustments = useCallback(async () => {
    await Promise.all([...pendingAdjustments.current]);
  }, []);

  useEffect(() => {
    updateEntries((current) =>
      current.filter(
        (entry) =>
          !entry.itemId ||
          pantry.items.some((item) => item.id === entry.itemId),
      ),
    );
  }, [pantry.items, updateEntries]);

  const handleCodes = useCallback(
    (values: string[]) => {
      const now = Date.now();
      for (const value of values) {
        const barcode = normalizeBarcode(value);
        if (!barcode) continue;
        const accepted = gate.accept(barcode, now);
        if (pausedRef.current || !accepted) continue;

        const matches = pantry.findByBarcode(barcode);
        // Newest first: a fresh purchase belongs with the latest lot.
        const item = matches[matches.length - 1];
        updateEntries((current) => recordScan(current, barcode, item?.id, now));
        if (item) {
          const adjustment = pantry
            .adjustQuantity(item.id, 1)
            .then(() => undefined)
            .catch((error: Error) => {
              updateEntries((current) => undoScan(current, barcode, item.id));
              Alert.alert('Not added', error.message);
            });
          pendingAdjustments.current.add(adjustment);
          adjustment.then(() => pendingAdjustments.current.delete(adjustment));
        }
      }
    },
    [gate, pantry, updateEntries],
  );

  /** The item whose units this session entry actually changed. */
  const itemFor = (entry: ScanEntry): PantryItem | undefined => {
    return entry.itemId
      ? pantry.items.find((item) => item.id === entry.itemId)
      : undefined;
  };

  const takeOneBack = async (entry: ScanEntry, item: PantryItem) => {
    try {
      await pantry.adjustQuantity(item.id, -1);
      updateEntries((current) =>
        undoScan(current, entry.barcode, entry.itemId),
      );
    } catch (error) {
      Alert.alert('Not changed', (error as Error).message);
    }
  };

  const forget = (entry: ScanEntry) =>
    updateEntries((current) =>
      current.filter((other) => scanEntryKey(other) !== scanEntryKey(entry)),
    );

  const showCountedActions = (entry: ScanEntry, item: PantryItem) => {
    const key = scanEntryKey(entry);
    pausedRef.current = true;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: item.name,
        options: ['Take one back', 'Open item', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 2,
      },
      async (index) => {
        try {
          await settleAdjustments();
          const latestEntry = entriesRef.current.find(
            (current) => scanEntryKey(current) === key,
          );
          const latestItem = latestEntry?.itemId
            ? pantry.items.find((current) => current.id === latestEntry.itemId)
            : undefined;
          if (!latestEntry || !latestItem) return;
          if (index === 0) await takeOneBack(latestEntry, latestItem);
          if (index === 1) {
            navigation.navigate('EditPantryItem', { item: latestItem });
          }
        } finally {
          pausedRef.current = false;
        }
      },
    );
  };

  const showNewCodeActions = (entry: ScanEntry) => {
    const key = scanEntryKey(entry);
    const categories = pantry.categories;
    pausedRef.current = true;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Add to which category?',
        message: `Barcode ${entry.barcode}`,
        options: [...categories, 'Remove from list', 'Cancel'],
        destructiveButtonIndex: categories.length,
        cancelButtonIndex: categories.length + 1,
      },
      async (index) => {
        try {
          await settleAdjustments();
          const latestEntry = entriesRef.current.find(
            (current) => scanEntryKey(current) === key,
          );
          if (!latestEntry) return;
          if (index >= 0 && index < categories.length) {
            navigation.navigate('NewPantryItem', {
              category: categories[index],
              barcode: latestEntry.barcode,
              quantity: latestEntry.count,
              onSaved: (item: PantryItem, quantity: number) => {
                updateEntries((current) =>
                  reconcileAddedItem(
                    current,
                    latestEntry.barcode,
                    item.id,
                    quantity,
                  ),
                );
              },
            });
          } else if (index === categories.length) {
            forget(latestEntry);
          }
        } finally {
          pausedRef.current = false;
        }
      },
    );
  };

  const cameraHeight =
    frameHeight > 0
      ? Math.max(
          MIN_CAMERA_HEIGHT,
          Math.min(
            CAMERA_HEIGHT,
            frameHeight -
              SPACING.sm -
              SPACING.md -
              headerDetailsHeight -
              footerClearance -
              2.5 * ROW_MIN_HEIGHT,
          ),
        )
      : CAMERA_HEIGHT;

  const headerDetails = (
    <View
      style={styles.headerDetails}
      onLayout={(event) =>
        setHeaderDetailsHeight(event.nativeEvent.layout.height)
      }
    >
      {entries.length === 0 ? (
        <InfoBlock tone="tip">
          Hold a barcode inside the frame. Items already in your pantry go up by
          one each scan. New barcodes wait below until you add them.
        </InfoBlock>
      ) : (
        <SectionEyebrow>Scanned</SectionEyebrow>
      )}
    </View>
  );

  return (
    <ScreenBody>
      <View
        style={[styles.layout, Platform.OS === 'android' && styles.bleed]}
        onLayout={(event) => setFrameHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.camera,
              { backgroundColor: COLORS.SURFACE_CONTAINER_HIGH },
              { height: cameraHeight },
            ]}
            testID="scan-camera-frame"
          >
            {Platform.OS === 'ios' ? (
              <PantryScanCamera
                isActive={isFocused && appActive}
                onCodes={handleCodes}
              />
            ) : (
              <View style={styles.unavailable}>
                <InfoBlock inline title="Not on Android yet">
                  Barcode scanning is coming to Android. Add items by hand from
                  a pantry category for now.
                </InfoBlock>
              </View>
            )}
          </View>
          {headerDetails}
        </View>
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: footerClearance }}
        >
          <View style={styles.gutter}>
            {entries.length > 0 && (
              <GroupContainer>
                {entries.map((entry, index) => {
                  const item = itemFor(entry);
                  const isLast = index === entries.length - 1;
                  if (item) {
                    return (
                      <ModuleRow
                        key={scanEntryKey(entry)}
                        variant="tool"
                        icon="checkmark-circle-outline"
                        iconColor={COLORS.SUCCESS}
                        title={item.name}
                        subtitle={`+${entry.count} this session`}
                        value={quantityLabel(item)}
                        showSeparator={!isLast}
                        onPress={() => showCountedActions(entry, item)}
                      />
                    );
                  }
                  return (
                    <ModuleRow
                      key={scanEntryKey(entry)}
                      variant="tool"
                      icon="add-circle-outline"
                      iconColor={COLORS.ACCENT}
                      title="New barcode"
                      subtitle={`${entry.barcode}, scanned ${entry.count}×. Tap to add.`}
                      showSeparator={!isLast}
                      onPress={() => showNewCodeActions(entry)}
                    />
                  );
                })}
              </GroupContainer>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenBody>
  );
});

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  bleed: {
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  header: {
    paddingTop: SPACING.sm,
    paddingHorizontal: Platform.OS === 'android' ? 0 : SCREEN_GUTTER,
    gap: SPACING.md,
  },
  headerDetails: {
    minHeight: 1,
  },
  gutter: {
    paddingHorizontal: Platform.OS === 'android' ? 0 : SCREEN_GUTTER,
  },
  camera: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
});
