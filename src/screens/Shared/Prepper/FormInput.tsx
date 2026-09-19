import React from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { inventoryFormStyles as styles } from '../../Inventory/inventoryFormStyles';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}

/**
 * Themed text input with label for inventory forms.
 */
export function FormInput({
  label,
  containerStyle,
  inputStyle,
  ...textInputProps
}: FormInputProps): React.JSX.Element {
  const COLORS = useTheme();

  return (
    <View style={[styles.formGroup, containerStyle]}>
      <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: COLORS.PRIMARY_LIGHT,
            borderColor: COLORS.SECONDARY_ACCENT,
            color: COLORS.PRIMARY_DARK,
          },
          inputStyle,
        ]}
        placeholderTextColor={COLORS.MUTED}
        {...textInputProps}
      />
    </View>
  );
}
