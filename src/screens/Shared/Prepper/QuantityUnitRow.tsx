import React from 'react';
import { TextInput, View } from 'react-native';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { inventoryFormStyles as styles } from '../../Inventory/inventoryFormStyles';

interface QuantityUnitRowProps {
  quantity: string;
  unit: string;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
}

/**
 * Quantity and Unit input row for inventory forms.
 */
export function QuantityUnitRow({
  quantity,
  unit,
  onQuantityChange,
  onUnitChange,
}: QuantityUnitRowProps): React.JSX.Element {
  const COLORS = useTheme();

  return (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
        Quantity & Unit *
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            styles.inputQuantity,
            {
              backgroundColor: COLORS.PRIMARY_LIGHT,
              borderColor: COLORS.SECONDARY_ACCENT,
              color: COLORS.PRIMARY_DARK,
            },
          ]}
          placeholder="Quantity..."
          placeholderTextColor={COLORS.MUTED}
          value={quantity}
          onChangeText={onQuantityChange}
          keyboardType="numeric"
          accessibilityLabel="Quantity"
        />
        <TextInput
          style={[
            styles.input,
            styles.inputUnit,
            {
              backgroundColor: COLORS.PRIMARY_LIGHT,
              borderColor: COLORS.SECONDARY_ACCENT,
              color: COLORS.PRIMARY_DARK,
            },
          ]}
          placeholder="Unit (optional)..."
          placeholderTextColor={COLORS.MUTED}
          value={unit}
          onChangeText={onUnitChange}
          accessibilityLabel="Unit"
        />
      </View>
    </View>
  );
}
