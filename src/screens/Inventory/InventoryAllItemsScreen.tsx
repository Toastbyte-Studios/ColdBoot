import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React, { useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import ProgressiveList from '../../components/ProgressiveList';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useProgressiveList } from '../../hooks/useProgressiveList';
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

type InventoryAllItemsNavigationProp = NativeStackNavigationProp<
  { EditInventoryItem: { item: InventoryItem } },
  'EditInventoryItem'
>;

/**
 * Displays all inventory items from all categories, sorted alphabetically by name.
 *
 * This screen shows a comprehensive list of all inventory items across all categories.
 * Items are displayed in alphabetical order for easy searching and reference.
 *
 * @returns {JSX.Element} The rendered inventory all items screen component.
 */
export default observer(function InventoryAllItemsScreen(): React.JSX.Element {
  const navigation = useNavigation<InventoryAllItemsNavigationProp>();
  const inventory = useInventoryStore();
  const COLORS = useTheme();
  const allItems = inventory.allItemsSorted;
  // Drawn a batch at a time, so a long list doesn't hold up the screen.
  const visibleAllItems = useProgressiveList(allItems, 'all-items');

  const renderItem = useCallback(
    (item: InventoryItem, _index: number, isLast: boolean) => (
      <ModuleRow
        title={item.name}
        icon="cube-outline"
        subtitle={formatItemSubtitle(item)}
        value={formatItemQuantity(item)}
        variant="tool"
        showSeparator={!isLast}
        onPress={() => navigation.navigate('EditInventoryItem', { item })}
      />
    ),
    [navigation],
  );

  return (
    <StackScreen title="All Inventory Items">
      {allItems.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No inventory items yet. Add items from a category.
        </Text>
      ) : (
        <GroupContainer>
          <ProgressiveList items={visibleAllItems} renderItem={renderItem} />
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
