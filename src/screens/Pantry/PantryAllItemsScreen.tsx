import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
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

type PantryAllItemsNavigationProp = NativeStackNavigationProp<
  { EditPantryItem: { item: PantryItem } },
  'EditPantryItem'
>;

/**
 * Displays all pantry items from all categories, sorted alphabetically by name.
 *
 * This screen shows a comprehensive list of all pantry items across all categories.
 * Items are displayed in alphabetical order for easy searching and reference.
 *
 * @returns {JSX.Element} The rendered pantry all items screen component.
 */
export default observer(function PantryAllItemsScreen(): React.JSX.Element {
  const navigation = useNavigation<PantryAllItemsNavigationProp>();
  const pantry = usePantryStore();
  const COLORS = useTheme();
  const allItems = pantry.allItemsSorted;

  const handleItemPress = (item: PantryItem) => {
    navigation.navigate('EditPantryItem', { item });
  };

  return (
    <StackScreen
      title="All Pantry Items"
      subtitle={`${allItems.length} item${allItems.length === 1 ? '' : 's'}`}
    >
      {allItems.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No pantry items yet. Add items from a category.
        </Text>
      ) : (
        <GroupContainer>
          {allItems.map((item, index) => (
            <ModuleRow
              key={item.id}
              title={item.name}
              icon="restaurant-outline"
              subtitle={[item.category, item.notes].filter(Boolean).join(' · ')}
              value={quantityLabel(item)}
              variant="tool"
              showSeparator={index < allItems.length - 1}
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
