import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text } from '../../../components/ScaledText';
import SelectMenu, { SelectMenuOption } from '../../../components/SelectMenu';
import { useTheme } from '../../../hooks/useTheme';
import { inventoryFormStyles as styles } from '../../Inventory/inventoryFormStyles';

interface FormPickerButtonProps<T extends string> {
  /** Shown in the field: the current value, or a prompt when unset. */
  label: string;
  /** Menu heading and the start of the accessibility label, e.g. "Month". */
  title: string;
  options: readonly SelectMenuOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
}

/**
 * Form field that opens a native menu (used for inventory month/year).
 *
 * @remarks
 * A `SelectMenu` trigger rather than a `Touchable`: the native menu owns the
 * tap. It replaced `Alert.alert` pickers — Android shows at most three alert
 * buttons, so the 77-option year picker could not work there at all.
 */
export function FormPickerButton<T extends string>({
  label,
  title,
  options,
  value,
  onSelect,
}: FormPickerButtonProps<T>): React.JSX.Element {
  const COLORS = useTheme();

  return (
    <SelectMenu
      title={title}
      options={options}
      value={value}
      onSelect={onSelect}
      accessibilityLabel={`${title}: ${label}`}
      style={localStyles.menu}
    >
      <View
        style={[
          localStyles.field,
          {
            backgroundColor: COLORS.PRIMARY_LIGHT,
            borderColor: COLORS.SECONDARY_ACCENT,
          },
        ]}
      >
        <Text
          style={[styles.pickerText, { color: COLORS.PRIMARY_DARK }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={16}
          color={COLORS.PRIMARY_DARK}
        />
      </View>
    </SelectMenu>
  );
}

const localStyles = StyleSheet.create({
  // Takes the row share that formStyles.pickerButton used to. The flex lives
  // on the menu, not the field: a flex:1 child inside the menu's own wrapper
  // would collapse to zero height.
  menu: {
    flex: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
});
