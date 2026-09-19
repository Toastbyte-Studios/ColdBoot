import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useInventoryStore } from '../../stores';
import { InventoryItem } from '../../stores/InventoryStore';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  FormInput,
  FormTextArea,
  FormButtonRow,
  DeleteButton,
  QuantityUnitRow,
  ExpirationDatePicker,
} from '../Shared/Prepper';

const isAndroid = Platform.OS === 'android';

type EditInventoryItemRouteProp = RouteProp<
  { EditInventoryItem: { item: InventoryItem } },
  'EditInventoryItem'
>;

/**
 * Screen for editing an existing inventory item.
 *
 * Allows users to:
 * - Edit item name
 * - Update quantity
 * - Change unit
 * - Modify notes
 * - Set expiration date (optional, month and year)
 * - Delete the item
 *
 * @returns {React.JSX.Element} The rendered edit inventory item screen component.
 */
export default observer(function EditInventoryItemScreen(): React.JSX.Element {
  const route = useRoute<EditInventoryItemRouteProp>();
  const navigation = useNavigation();
  const inventory = useInventoryStore();
  const COLORS = useTheme();

  const { item } = route.params || {};
  const [name, setName] = useState<string>(item?.name || '');
  const [quantity, setQuantity] = useState<string>(
    item?.quantity?.toString() || '1',
  );
  const [unit, setUnit] = useState<string>(item?.unit || '');
  const [notes, setNotes] = useState<string>(item?.notes || '');
  const [expirationMonth, setExpirationMonth] = useState<number | undefined>(
    item?.expirationMonth,
  );
  const [expirationYear, setExpirationYear] = useState<number | undefined>(
    item?.expirationYear,
  );

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      Alert.alert('Error', 'Please enter a valid quantity (0 or greater)');
      return;
    }

    try {
      await inventory.updateItem(item.id, {
        name: trimmedName,
        quantity: quantityNum,
        unit: unit.trim() || undefined,
        notes: notes.trim() || undefined,
        expirationMonth,
        expirationYear,
      });
      Alert.alert('Success', 'Item updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Failed to update item');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventory.deleteItem(item.id);
              Alert.alert('Success', 'Item deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
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
  };

  if (!item) {
    return (
      <StackScreen title="Edit Item">
        <Text style={[styles.errorText, { color: COLORS.ERROR }]}>
          Item not found
        </Text>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title="Edit Item"
      subtitle={item.category}
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView
        testID="inventory-item-form-keyboard"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View
          testID="inventory-item-form-card"
          style={[styles.formCard, cardSurface(COLORS)]}
        >
          <FormInput
            label="Item Name *"
            placeholder="Enter item name..."
            value={name}
            onChangeText={setName}
            accessibilityLabel="Item name"
          />

          <QuantityUnitRow
            quantity={quantity}
            unit={unit}
            onQuantityChange={setQuantity}
            onUnitChange={setUnit}
          />

          <ExpirationDatePicker
            month={expirationMonth}
            year={expirationYear}
            onMonthChange={setExpirationMonth}
            onYearChange={setExpirationYear}
          />

          <FormTextArea
            label="Notes (optional)"
            placeholder="Enter notes..."
            value={notes}
            onChangeText={setNotes}
            accessibilityLabel="Notes"
          />

          <FormButtonRow
            onCancel={() => navigation.goBack()}
            onSave={handleSave}
            saveDisabled={!name.trim()}
            saveLabel="Save"
          />

          <DeleteButton onPress={handleDelete} />
        </View>
      </KeyboardAvoidingView>
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  formCard: {
    marginTop: SPACING.md,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  errorText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
