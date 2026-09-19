import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useInventoryStore } from '../../stores';

/**
 * Inventory landing screen.
 *
 * @remarks
 * Presents a dashboard of inventory-related actions and routes:
 * - **View All** → navigates to the `InventoryAllItems` screen showing all items alphabetically
 * - **Manage Categories** → navigates to the `ManageInventoryCategories` screen
 * - **Inventory Categories** → listed as rows in one grouped list that navigate to category-specific screens
 *
 * Uses React Navigation to perform screen transitions from row taps.
 *
 * @returns A screen layout containing a title row with action buttons and a grouped list of navigation rows.
 */
export default observer(function InventoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const inventory = useInventoryStore();

  const categoryIcons: Record<string, string> = {
    'Home Base': 'home-outline',
    'Main Vehicle': 'car-outline',
  };

  return (
    <StackScreen
      title="Inventory"
      subtitle={`${inventory.categories.length} categor${inventory.categories.length === 1 ? 'y' : 'ies'}`}
      trailing={
        <>
          <IconButton
            name="list-outline"
            size={22}
            accessibilityLabel="View All Items"
            onPress={() => navigation.navigate('InventoryAllItems')}
          />
          <IconButton
            name="folder-open-outline"
            size={22}
            accessibilityLabel="Manage Categories"
            onPress={() => navigation.navigate('ManageInventoryCategories')}
          />
        </>
      }
    >
      <GroupContainer>
        {inventory.categories.map((cat, index, all) => (
          <ModuleRow
            key={cat}
            title={cat}
            icon={categoryIcons[cat] || 'cube-outline'}
            variant="tool"
            showSeparator={index < all.length - 1}
            onPress={() =>
              navigation.navigate('InventoryCategory', { category: cat })
            }
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
