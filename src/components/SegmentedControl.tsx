import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { DARK_COLORS } from '../theme/colors';

export interface SegmentedOption<T extends string = string> {
  value: T;
  /** Keep it short: segments share the control's width equally. */
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Describes the group, e.g. "Input format". Segments announce themselves. */
  accessibilityLabel?: string;
  /** Layout only — give it a width or `flex` in a row; height is native. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Mutually exclusive choice between a few short options: `UISegmentedControl`
 * on iOS, and the library's matching JS implementation on Android.
 *
 * Height is left to the platform (32pt on iOS) rather than forced to the 44pt
 * target in docs/NATIVE_REDESIGN.md finding 8 — the native control's own
 * metrics are the thing being matched here.
 *
 * Use `SelectMenu` instead once the options stop fitting on one line.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const COLORS = useTheme();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <NativeSegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={selectedIndex}
      onChange={(event) => {
        const next = options[event.nativeEvent.selectedSegmentIndex];
        if (next) {
          onChange(next.value);
        }
      }}
      // Follows the in-app theme setting rather than the OS, which can differ.
      appearance={COLORS === DARK_COLORS ? 'dark' : 'light'}
      accessibilityLabel={accessibilityLabel}
      style={style}
      testID={testID}
    />
  );
}
