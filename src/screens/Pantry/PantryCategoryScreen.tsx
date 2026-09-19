import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { usePantryStore } from '../../stores';
import { PantryItem } from '../../stores/PantryStore';
import { TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';

const isAndroid = Platform.OS === 'android';

const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

function quantityLabel(item: PantryItem): string {
  return `Quantity: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

type PantryCategoryParamList = {
  PantryCategory: { category: string };
  EditPantryItem: { item: PantryItem };
  NewPantryItem: { category: string };
};
type PantryCategoryRouteProp = RouteProp<
  PantryCategoryParamList,
  'PantryCategory'
>;
type PantryCategoryNavigationProp = NativeStackNavigationProp<
  PantryCategoryParamList,
  'PantryCategory'
>;

/**
 * Displays all pantry items for a specific category.
 *
 * This screen retrieves the category name from the navigation route parameters
 * and displays all items belonging to that category in a list layout.
 * If no items are found for the category, a helper message is shown.
 *
 * @returns {JSX.Element} The rendered pantry category screen component.
 */
export default observer(function PantryCategoryScreen(): React.JSX.Element {
  const route = useRoute<PantryCategoryRouteProp>();
  const navigation = useNavigation<PantryCategoryNavigationProp>();
  const pantry = usePantryStore();
  const COLORS = useTheme();

  const { category } = route.params || {};
  const isValidCategory = category && pantry.categories.includes(category);
  const items = useMemo(
    () => (isValidCategory ? (pantry.itemsByCategory[category] ?? []) : []),
    [isValidCategory, category, pantry.itemsByCategory],
  );

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [items],
  );

  const handleAddItem = () => {
    if (!isValidCategory) {
      return;
    }
    navigation.navigate('NewPantryItem', { category });
  };

  if (!isValidCategory) {
    return (
      <StackScreen title="Category not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          The requested category does not exist.
        </Text>
      </StackScreen>
    );
  }

  const handleItemPress = (item: PantryItem) => {
    navigation.navigate('EditPantryItem', { item });
  };

  return (
    <StackScreen
      title={category}
      subtitle={`${sortedItems.length} item${sortedItems.length === 1 ? '' : 's'}`}
      trailing={
        <IconButton
          name="add-circle-outline"
          size={22}
          accessibilityLabel={`Add item to ${category}`}
          onPress={handleAddItem}
        />
      }
    >
      {sortedItems.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No items in this category yet.
        </Text>
      ) : (
        <GroupContainer>
          {sortedItems.map((item, index) => (
            <ModuleRow
              key={item.id}
              title={item.name}
              icon="restaurant-outline"
              subtitle={item.notes}
              value={quantityLabel(item)}
              variant="tool"
              showSeparator={index < sortedItems.length - 1}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  helperText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
