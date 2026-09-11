import { MenuView } from '@react-native-menu/menu';
import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { DARK_COLORS } from '../theme/colors';

export interface SelectMenuOption<T extends string = string> {
  /** Returned to `onSelect`. Must be unique within the menu. */
  value: T;
  label: string;
}

export interface SelectMenuProps<T extends string> {
  /** Menu heading. Shown on iOS; Android's PopupMenu has no title. */
  title?: string;
  options: readonly SelectMenuOption<T>[];
  /** The current value. Checked in the menu on iOS. */
  value?: T;
  onSelect: (value: T) => void;
  /**
   * Read on the trigger by screen readers. There is no default: include the
   * current value, e.g. "Category: Personal".
   */
  accessibilityLabel: string;
  /** @default 'Opens a menu' */
  accessibilityHint?: string;
  /** Layout for the menu container, e.g. `flex: 1` inside a row. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * The trigger — usually a field showing the current value and a chevron.
   * It must not be pressable itself: the native view owns the tap, and a
   * `Touchable` child would swallow it before the menu could open.
   */
  children: React.ReactNode;
}

/**
 * Pick-one-from-a-list menu: `UIMenu` on iOS, `PopupMenu` on Android, via
 * `@react-native-menu/menu`.
 *
 * Replaces the hand-built dropdowns (an absolutely-positioned list under a
 * touchable header) and the transparent `Modal` lists this app used for
 * pickers. See docs/NATIVE_REDESIGN.md, "Native menus".
 */
export default function SelectMenu<T extends string>({
  title,
  options,
  value,
  onSelect,
  accessibilityLabel,
  accessibilityHint = 'Opens a menu',
  style,
  testID,
  children,
}: SelectMenuProps<T>) {
  const COLORS = useTheme();

  const actions = useMemo(
    () =>
      options.map((option) => ({
        id: option.value,
        title: option.label,
        state: option.value === value ? ('on' as const) : ('off' as const),
      })),
    [options, value],
  );

  return (
    <MenuView
      title={title}
      actions={actions}
      onPressAction={({ nativeEvent }) => {
        const picked = options.find((o) => o.value === nativeEvent.event);
        if (picked) {
          onSelect(picked.value);
        }
      }}
      // Follows the in-app theme setting rather than the OS, which can differ.
      themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
      style={style}
      testID={testID}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </View>
    </MenuView>
  );
}
