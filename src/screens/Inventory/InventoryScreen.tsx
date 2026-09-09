import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardTopic from '../../components/CardTopic';
import Grid from '../../components/Grid';
import { HorizontalRule } from '../../components/HorizontalRule';
import IconButton from '../../components/IconButton';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useInventoryStore } from '../../stores';

/**
 * Inventory landing screen.
 *
 * @remarks
 * Presents a dashboard of inventory-related actions and routes:
 * - **View All** → navigates to the `InventoryAllItems` screen showing all items alphabetically
 * - **Manage Categories** → navigates to the `ManageInventoryCategories` screen
 * - **Inventory Categories** → mapped as CardTopic cards that navigate to category-specific screens
 *
 * Uses React Navigation to perform screen transitions from card taps.
 *
 * @returns A screen layout containing a header, action buttons, and a grid of navigation cards.
 */
export default observer(function InventoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const inventory = useInventoryStore();

  const categoryIcons: Record<string, string> = {
    'Home Base': 'home-outline',
    'Main Vehicle': 'car-outline',
  };

  return (
    <ScreenBody>
      <SectionHeader>Inventory</SectionHeader>
      <View style={styles.inventoryHeader}>
        <IconButton
          name="list-outline"
          size={30}
          accessibilityLabel="View All Items"
          onPress={() => navigation.navigate('InventoryAllItems')}
        />
        <IconButton
          name="folder-open-outline"
          size={30}
          accessibilityLabel="Manage Categories"
          onPress={() => navigation.navigate('ManageInventoryCategories')}
        />
      </View>
      <HorizontalRule />

      <Grid>
        {inventory.categories.map((cat) => (
          <CardTopic
            key={cat}
            title={cat}
            icon={categoryIcons[cat] || 'cube-outline'}
            onPress={() =>
              navigation.navigate('InventoryCategory', { category: cat })
            }
          />
        ))}
      </Grid>
    </ScreenBody>
  );
});

const styles = StyleSheet.create({
  inventoryHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
});
