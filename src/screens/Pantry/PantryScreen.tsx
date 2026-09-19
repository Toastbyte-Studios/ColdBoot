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
import { usePantryStore } from '../../stores';

/**
 * Pantry landing screen.
 *
 * @remarks
 * Presents a dashboard of pantry-related actions and routes:
 * - **View All** → navigates to the `PantryAllItems` screen showing all items alphabetically
 * - **Manage Categories** → navigates to the `ManagePantryCategories` screen
 * - **Pantry Categories** → listed as rows in one grouped list that navigate to category-specific screens
 *
 * Uses React Navigation to perform screen transitions from row taps.
 *
 * @returns A screen layout containing a title row with action buttons and a grouped list of navigation rows.
 */
export default observer(function PantryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pantry = usePantryStore();

  const categoryIcons: Record<string, string> = {
    'Canned Goods': 'flask-outline',
    'Dry Goods': 'nutrition-outline',
    Frozen: 'snow-outline',
    Fresh: 'leaf-outline',
  };

  return (
    <StackScreen
      title="Pantry"
      subtitle={`${pantry.categories.length} categor${pantry.categories.length === 1 ? 'y' : 'ies'}`}
      trailing={
        <>
          <IconButton
            name="list-outline"
            size={22}
            accessibilityLabel="View All Items"
            onPress={() => navigation.navigate('PantryAllItems')}
          />
          <IconButton
            name="time-outline"
            size={22}
            accessibilityLabel="Expiration Tracker"
            onPress={() => navigation.navigate('PantryExpirationTracker')}
          />
          <IconButton
            name="folder-open-outline"
            size={22}
            accessibilityLabel="Manage Categories"
            onPress={() => navigation.navigate('ManagePantryCategories')}
          />
        </>
      }
    >
      <GroupContainer>
        {pantry.categories.map((cat, index, all) => (
          <ModuleRow
            key={cat}
            title={cat}
            icon={categoryIcons[cat] || 'restaurant-outline'}
            variant="tool"
            showSeparator={index < all.length - 1}
            onPress={() =>
              navigation.navigate('PantryCategory', { category: cat })
            }
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
