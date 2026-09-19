import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { usePantryStore } from '../../stores';
import { ExpirationStatus, PantryItem } from '../../stores/PantryStore';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { ColorScheme } from '../../theme/colors';

type PantryExpirationTrackerNavigationProp = NativeStackNavigationProp<
  { EditPantryItem: { item: PantryItem } },
  'EditPantryItem'
>;

const isAndroid = Platform.OS === 'android';

const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Returns a human-readable expiration label for an item. */
function formatExpiration(month?: number, year?: number): string {
  if (!month || !year) {
    return 'No expiration date';
  }
  return `Expires ${MONTH_NAMES[month]} ${year}`;
}

/** Returns a human-readable label for how many days remain. */
function formatDaysRemaining(days: number | null): string {
  if (days === null) {
    return '';
  }
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  }
  if (days === 0) {
    return 'Expires today!';
  }
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

/**
 * Pantry Expiration Tracker screen.
 *
 * Displays all pantry items with expiration dates sorted by soonest expiration.
 * Items are color-coded:
 * - Green  — 30+ days remaining
 * - Yellow — within 30 days
 * - Red    — expired (expiration month has passed; days <= 0)
 *
 * Provides category filtering and a quick "Mark as Used" action that
 * decrements an item's quantity by one (removing the item when it reaches zero).
 *
 * @returns {React.JSX.Element} The rendered expiration tracker screen.
 */
export default observer(
  function PantryExpirationTrackerScreen(): React.JSX.Element {
    const navigation = useNavigation<PantryExpirationTrackerNavigationProp>();
    const pantry = usePantryStore();
    const COLORS = useTheme();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
      null,
    );
    const usedButtonStyle = useMemo(
      () => [
        styles.usedButton,
        {
          backgroundColor: COLORS.SECONDARY_CONTAINER,
          borderColor: isAndroid ? 'transparent' : COLORS.BORDER,
        },
      ],
      [COLORS],
    );

    const sortedItems = pantry.itemsSortedByExpiration();

    const filteredItems =
      selectedCategory === null
        ? sortedItems
        : sortedItems.filter((item) => item.category === selectedCategory);

    const handleItemPress = useCallback(
      (item: PantryItem) => {
        navigation.navigate('EditPantryItem', { item });
      },
      [navigation],
    );

    const handleMarkUsed = useCallback(
      (item: PantryItem) => {
        if (item.quantity > 1) {
          Alert.alert(
            'Mark as Used',
            `Reduce "${item.name}" by 1?\n\nCurrent quantity: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Use 1',
                onPress: async () => {
                  try {
                    await pantry.updateItem(item.id, {
                      quantity: item.quantity - 1,
                    });
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      (error as Error).message || 'Failed to update item',
                    );
                  }
                },
              },
            ],
          );
        } else {
          Alert.alert(
            'Mark as Used',
            `Remove "${item.name}" from your pantry? (Last unit)`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await pantry.deleteItem(item.id);
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      (error as Error).message || 'Failed to delete item',
                    );
                  }
                },
              },
            ],
          );
        }
      },
      [pantry],
    );

    /** Accent color based on expiration status. */
    const statusAccentColor = (status: ExpirationStatus): string => {
      switch (status) {
        case 'red':
          return COLORS.ERROR;
        case 'yellow':
          return COLORS.ACCENT;
        case 'green':
          return COLORS.SUCCESS;
        default:
          return COLORS.SECONDARY_ACCENT;
      }
    };

    return (
      <StackScreen
        title="Expiration Tracker"
        subtitle={`${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="menu"
          accessibilityLabel="Category filters"
          accessibilityHint="Shows pantry items for the selected category"
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          <Touchable
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  selectedCategory === null
                    ? COLORS.ACCENT_CONTAINER
                    : isAndroid
                      ? COLORS.SURFACE_CONTAINER
                      : COLORS.SURFACE,
                borderColor:
                  selectedCategory === null ? COLORS.ACCENT : COLORS.BORDER,
              },
            ]}
            onPress={() => setSelectedCategory(null)}
            accessibilityLabel="Show all categories"
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === null }}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    selectedCategory === null
                      ? COLORS.ON_ACCENT_CONTAINER
                      : COLORS.PRIMARY_DARK,
                },
              ]}
            >
              All
            </Text>
          </Touchable>
          {pantry.categories.map((cat) => (
            <Touchable
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategory === cat
                      ? COLORS.ACCENT_CONTAINER
                      : isAndroid
                        ? COLORS.SURFACE_CONTAINER
                        : COLORS.SURFACE,
                  borderColor:
                    selectedCategory === cat ? COLORS.ACCENT : COLORS.BORDER,
                },
              ]}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat ? null : cat)
              }
              accessibilityLabel={`Filter by ${cat}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === cat }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedCategory === cat
                        ? COLORS.ON_ACCENT_CONTAINER
                        : COLORS.PRIMARY_DARK,
                  },
                ]}
              >
                {cat}
              </Text>
            </Touchable>
          ))}
        </ScrollView>

        {filteredItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: groundInk(COLORS) }]}>
            {sortedItems.length === 0
              ? 'No items with expiration dates. Add expiration dates to your pantry items to track them here.'
              : 'No items in this category have expiration dates.'}
          </Text>
        ) : (
          <View style={styles.items}>
            {filteredItems.map((item) => {
              const days = pantry.getExpirationDaysRemaining(item);
              const status = pantry.getExpirationStatus(item);
              const accent = statusAccentColor(status);

              return (
                <Touchable
                  key={item.id}
                  style={[styles.itemCard, cardSurface(COLORS, { accent })]}
                  onPress={() => handleItemPress(item)}
                  accessibilityLabel={`Edit ${item.name}`}
                  accessibilityRole="button"
                >
                  <View style={styles.itemRow}>
                    <View
                      style={[styles.statusDot, { backgroundColor: accent }]}
                    />

                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: COLORS.PRIMARY_DARK },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.itemCategory,
                          { color: COLORS.PRIMARY_DARK },
                        ]}
                      >
                        {item.category}
                        {' · '}
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ''}
                      </Text>
                      <Text
                        style={[
                          styles.expirationText,
                          { color: COLORS.PRIMARY_DARK },
                        ]}
                      >
                        {formatExpiration(
                          item.expirationMonth,
                          item.expirationYear,
                        )}
                      </Text>
                      {days !== null ? (
                        <Text style={[styles.daysText, { color: accent }]}>
                          {formatDaysRemaining(days)}
                        </Text>
                      ) : null}
                    </View>

                    <IconButton
                      name="checkmark-circle-outline"
                      size={28}
                      color={COLORS.PRIMARY_DARK}
                      accessibilityLabel={`Mark ${item.name} as used`}
                      style={usedButtonStyle}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkUsed(item);
                      }}
                    />
                  </View>
                </Touchable>
              );
            })}
          </View>
        )}
      </StackScreen>
    );
  },
);

const styles = StyleSheet.create({
  filterRow: {
    flexGrow: 0,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  filterContent: {
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  items: {
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  itemCard: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 13,
    opacity: 0.65,
  },
  expirationText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
  },
  usedButton: {
    borderRadius: 999,
    borderWidth: isAndroid ? 0 : 1,
  },
});
