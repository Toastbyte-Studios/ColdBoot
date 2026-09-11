import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../stores';
import { NoteSortOrder } from '../stores/SettingsStore';
import { Text } from './ScaledText';
import SelectMenu from './SelectMenu';

const SORT_OPTIONS: { value: NoteSortOrder; label: string; icon: string }[] = [
  { value: 'newest-oldest', label: 'Newest', icon: 'arrow-down-outline' },
  { value: 'oldest-newest', label: 'Oldest', icon: 'arrow-up-outline' },
  { value: 'a-z', label: 'A-Z', icon: 'text-outline' },
  { value: 'z-a', label: 'Z-A', icon: 'text-outline' },
];

/**
 * Shows the current note sort order and opens a native menu to change it.
 * The sort order is persisted in the SettingsStore and affects all note lists
 * globally.
 *
 * This used to cycle through the four orders on tap, so the options were
 * invisible and reaching Z-A took three taps.
 */
export const NoteSortSelector = observer(() => {
  const settingsStore = useSettingsStore();
  const COLORS = useTheme();

  const currentOption =
    SORT_OPTIONS.find((opt) => opt.value === settingsStore.noteSortOrder) ??
    SORT_OPTIONS[0];

  return (
    <SelectMenu
      title="Sort notes"
      options={SORT_OPTIONS}
      value={settingsStore.noteSortOrder}
      onSelect={(order) => settingsStore.setNoteSortOrder(order)}
      accessibilityLabel={`Sort by: ${currentOption.label}`}
      style={styles.menu}
    >
      <View style={styles.trigger}>
        <Ionicons
          name={currentOption.icon}
          size={18}
          color={COLORS.PRIMARY_DARK}
        />
        <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
          {currentOption.label}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={14}
          color={COLORS.PRIMARY_DARK}
        />
      </View>
    </SelectMenu>
  );
});

const styles = StyleSheet.create({
  menu: {
    alignSelf: 'flex-end',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 0,
    minWidth: 48,
    textAlign: 'left',
  },
});
