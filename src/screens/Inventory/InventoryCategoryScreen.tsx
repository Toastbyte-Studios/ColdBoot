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
import { useInventoryStore } from '../../stores';
import { InventoryItem } from '../../stores/InventoryStore';
import { TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import {
  formatItemQuantity,
  formatItemSubtitle,
} from '../Shared/Prepper/itemRowFormatters';

const isAndroid = Platform.OS === 'android';

const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type InventoryCategoryParamList = {
  InventoryCategory: { category: string };
  EditInventoryItem: { item: InventoryItem };
  NewInventoryItem: { category: string };
};
type InventoryCategoryRouteProp = RouteProp<
  InventoryCategoryParamList,
  'InventoryCategory'
>;
type InventoryCategoryNavigationProp = NativeStackNavigationProp<
  InventoryCategoryParamList,
  'InventoryCategory'
>;

/**
 * Displays all inventory items for a specific category.
 *
 * This screen retrieves the category name from the navigation route parameters
 * and displays all items belonging to that category in a list layout.
 * If no items are found for the category, a helper message is shown.
 *
 * @returns {JSX.Element} The rendered inventory category screen component.
 */
export default observer(function InventoryCategoryScreen(): React.JSX.Element {
  const route = useRoute<InventoryCategoryRouteProp>();
  const navigation = useNavigation<InventoryCategoryNavigationProp>();
  const inventory = useInventoryStore();
  const COLORS = useTheme();

  const { category } = route.params || {};
  const isValidCategory = category && inventory.categories.includes(category);
  const items = useMemo(
    () => (isValidCategory ? (inventory.itemsByCategory[category] ?? []) : []),
    [isValidCategory, category, inventory.itemsByCategory],
  );

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [items],
  );

  const handleAddItem = () => {
    navigation.navigate('NewInventoryItem', { category });
  };

  const handleItemPress = (item: InventoryItem) => {
    navigation.navigate('EditInventoryItem', { item });
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
              icon="cube-outline"
              subtitle={formatItemSubtitle(item, category)}
              value={formatItemQuantity(item)}
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
