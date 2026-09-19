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

interface FormTextAreaProps extends Omit<TextInputProps, 'style'> {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Themed multiline text area with label for inventory forms.
 */
export function FormTextArea({
  label,
  containerStyle,
  ...textInputProps
}: FormTextAreaProps): React.JSX.Element {
  const COLORS = useTheme();

  return (
    <View style={[styles.formGroup, containerStyle]}>
      <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          {
            backgroundColor: COLORS.PRIMARY_LIGHT,
            borderColor: COLORS.SECONDARY_ACCENT,
            color: COLORS.PRIMARY_DARK,
          },
        ]}
        placeholderTextColor={COLORS.MUTED}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        {...textInputProps}
      />
    </View>
  );
}
