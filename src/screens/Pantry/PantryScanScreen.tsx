import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  AppState,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import InfoBlock from '../../components/InfoBlock';
import ModuleRow from '../../components/ModuleRow';
import PinnedHeaderScreen from '../../components/PinnedHeaderScreen';
import SectionEyebrow from '../../components/SectionEyebrow';
import { useTheme } from '../../hooks/useTheme';
import { useScreenHeader } from '../../navigation/ScreenHeaderContext';
import { usePantryStore } from '../../stores';
import { RADIUS, SPACING } from '../../theme';
import { normalizeBarcode } from '../../utils/barcode';
import { PantryScanCamera } from './scan/PantryScanCamera';
import {
  ScanEntry,
  ScanGate,
  recordScan,
  undoScan,
} from './scan/pantryScanSession';
import type { PantryItem } from '../../stores/PantryStore';

const CAMERA_HEIGHT = 240;

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
 * Keeps its own frame (`PinnedHeaderScreen`, not `StackScreen`) so the
 * camera stays in place while the list of scans scrolls beneath it.
 * Scanning is iOS-only for now; see `PantryScanCamera`.
 */
export default observer(function PantryScanScreen() {
  useScreenHeader({ title: 'Scan to Pantry' });
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pantry = usePantryStore();
  const isFocused = useIsFocused();
  const appActive = useAppActive();

  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [gate] = useState(() => new ScanGate());

  const handleCodes = useCallback(
    (values: string[]) => {
      const now = Date.now();
      for (const value of values) {
        const barcode = normalizeBarcode(value);
        if (!barcode || !gate.accept(barcode, now)) continue;

        const matches = pantry.findByBarcode(barcode);
        // Newest first: a fresh purchase belongs with the latest lot.
        const item = matches[matches.length - 1];
        setEntries((current) => recordScan(current, barcode, item?.id, now));
        if (item) {
          pantry.adjustQuantity(item.id, 1).catch((error: Error) => {
            setEntries((current) => undoScan(current, barcode));
            Alert.alert('Not added', error.message);
          });
        }
      }
    },
    [gate, pantry],
  );

  /** The item an entry's units went to, or the one added from it since. */
  const itemFor = (entry: ScanEntry): PantryItem | undefined => {
    if (entry.itemId) {
      return pantry.items.find((item) => item.id === entry.itemId);
    }
    const matches = pantry.findByBarcode(entry.barcode);
    return matches[matches.length - 1];
  };

  const takeOneBack = (entry: ScanEntry, item: PantryItem) => {
    pantry
      .adjustQuantity(item.id, -1)
      .then(() => setEntries((current) => undoScan(current, entry.barcode)))
      .catch((error: Error) => Alert.alert('Not changed', error.message));
  };

  const forget = (entry: ScanEntry) =>
    setEntries((current) =>
      current.filter((other) => other.barcode !== entry.barcode),
    );

  const showCountedActions = (entry: ScanEntry, item: PantryItem) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: item.name,
        options: ['Take one back', 'Open item', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) takeOneBack(entry, item);
        if (index === 1) navigation.navigate('EditPantryItem', { item });
      },
    );
  };

  const showNewCodeActions = (entry: ScanEntry) => {
    const categories = pantry.categories;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Add to which category?',
        message: `Barcode ${entry.barcode}`,
        options: [...categories, 'Remove from list', 'Cancel'],
        destructiveButtonIndex: categories.length,
        cancelButtonIndex: categories.length + 1,
      },
      (index) => {
        if (index < categories.length) {
          navigation.navigate('NewPantryItem', {
            category: categories[index],
            barcode: entry.barcode,
            quantity: entry.count,
          });
        } else if (index === categories.length) {
          forget(entry);
        }
      },
    );
  };

  const header = (
    <View style={styles.header}>
      <View
        style={[
          styles.camera,
          { backgroundColor: COLORS.SURFACE_CONTAINER_HIGH },
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
              Barcode scanning is coming to Android. Add items by hand from a
              pantry category for now.
            </InfoBlock>
          </View>
        )}
      </View>
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
    <PinnedHeaderScreen header={header}>
      {entries.length > 0 && (
        <GroupContainer>
          {entries.map((entry, index) => {
            const item = itemFor(entry);
            const isLast = index === entries.length - 1;
            if (item) {
              return (
                <ModuleRow
                  key={entry.barcode}
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
                key={entry.barcode}
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
    </PinnedHeaderScreen>
  );
});

const styles = StyleSheet.create({
  header: {
    gap: SPACING.md,
  },
  camera: {
    height: CAMERA_HEIGHT,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
});
