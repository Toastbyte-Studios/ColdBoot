import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import StackScreen from '../../components/StackScreen';
import { usePantryStore } from '../../stores';
import {
  FormInput,
  FormTextArea,
  FormButtonRow,
  QuantityUnitRow,
  ExpirationDatePicker,
} from '../Shared/Prepper';
import { FormCard } from '../Shared/Prepper/FormCard';
import {
  EMPTY_DETAILS_DRAFT,
  parseDetailsDraft,
  withDetailsField,
} from './pantryDetailsDraft';
import { PantryDetailsFields } from './PantryDetailsFields';
import type { ProductInfo } from '../../services/productLookup';
import type { PantryItem } from '../../stores/PantryStore';

type NewPantryItemRouteProp = RouteProp<
  {
    NewPantryItem: {
      category: string;
      /** From the scan screen: the code to save on the item. */
      barcode?: string;
      /** From the scan screen: how many times the code was scanned. */
      quantity?: number;
      /** From the scan screen: what a product lookup found, if anything. */
      product?: ProductInfo;
      /** Reconciles the scan session with the quantity the form saved. */
      onSaved?: (item: PantryItem, quantity: number) => void;
    };
  },
  'NewPantryItem'
>;

/**
 * Screen for adding a new pantry item.
 *
 * Allows users to:
 * - Enter item name (required)
 * - Set quantity (required, default 1)
 * - Specify unit (optional, e.g., "pieces", "lbs", "gallons")
 * - Add notes (optional)
 * - Set expiration date (optional, month and year)
 * - Add label details (optional): brand, barcode, serving size, calories
 *
 * Opened from the scan screen, the barcode and quantity arrive filled in,
 * with anything a product lookup found.
 *
 * @returns {React.JSX.Element} The rendered new pantry item screen component.
 */
export default observer(function NewPantryItemScreen(): React.JSX.Element {
  const route = useRoute<NewPantryItemRouteProp>();
  const navigation = useNavigation();
  const pantry = usePantryStore();

  const {
    category,
    barcode,
    quantity: scannedQuantity,
    product,
    onSaved,
  } = route.params || {};
  const [name, setName] = useState<string>(product?.name ?? '');
  const [quantity, setQuantity] = useState<string>(
    String(scannedQuantity ?? 1),
  );
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [expirationMonth, setExpirationMonth] = useState<number | undefined>();
  const [expirationYear, setExpirationYear] = useState<number | undefined>();
  const [details, setDetails] = useState(() => ({
    ...EMPTY_DETAILS_DRAFT,
    barcode: barcode ?? '',
    brand: product?.brand ?? '',
    servingSize: product?.servingSize ?? '',
    caloriesPerServing: product?.caloriesPerServing?.toString() ?? '',
    servingsPerUnit: product?.servingsPerUnit?.toString() ?? '',
  }));

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    if (!category || !pantry.categories.includes(category)) {
      Alert.alert('Error', 'Invalid category');
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      Alert.alert('Error', 'Please enter a valid quantity (0 or greater)');
      return;
    }

    const parsedDetails = parseDetailsDraft(details);
    if (!parsedDetails.ok) {
      Alert.alert('Error', parsedDetails.error);
      return;
    }

    try {
      const item = await pantry.createItem(
        trimmedName,
        category,
        quantityNum,
        unit.trim() || undefined,
        notes.trim() || undefined,
        expirationMonth,
        expirationYear,
        parsedDetails.details,
      );
      onSaved?.(item, item.quantity);
      Alert.alert('Success', 'Item added successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Failed to add item');
    }
  };

  return (
    <StackScreen
      title="Add Pantry Item"
      subtitle={category}
      keyboardShouldPersistTaps="handled"
    >
      <FormCard testID="pantry-item-form">
        <FormInput
          label="Item Name *"
          placeholder="Enter item name..."
          value={name}
          onChangeText={setName}
          autoFocus
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

        <PantryDetailsFields
          draft={details}
          onChangeField={(key, value) =>
            setDetails((current) => withDetailsField(current, key, value))
          }
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
      </FormCard>
    </StackScreen>
  );
});
