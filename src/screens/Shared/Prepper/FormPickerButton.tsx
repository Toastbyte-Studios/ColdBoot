import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../../components/ScaledText';
import Touchable, { TouchableProps } from '../../../components/Touchable';
import { useTheme } from '../../../hooks/useTheme';
import { inventoryFormStyles as styles } from '../../Inventory/inventoryFormStyles';

interface FormPickerButtonProps extends Omit<TouchableProps, 'style'> {
  label: string;
}

/**
 * Themed picker button for inventory forms (used for month/year selection).
 *
 * @remarks
 * This is a menu trigger — see the native-menu decision in
 * docs/NATIVE_REDESIGN.md. It is a `Touchable` rather than an `AppButton`
 * because it is a form field that opens a list, not an action.
 */
export function FormPickerButton({
  label,
  ...touchableProps
}: FormPickerButtonProps): React.JSX.Element {
  const COLORS = useTheme();

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Tap to change.`}
      style={[
        styles.pickerButton,
        localStyles.target,
        {
          backgroundColor: COLORS.PRIMARY_LIGHT,
          borderColor: COLORS.SECONDARY_ACCENT,
        },
      ]}
      {...touchableProps}
    >
      <Text style={[styles.pickerText, { color: COLORS.PRIMARY_DARK }]}>
        {label}
      </Text>
    </Touchable>
  );
}

const localStyles = StyleSheet.create({
  target: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
