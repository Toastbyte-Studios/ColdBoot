import React from 'react';
import { StyleProp, Switch, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export type AppSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Track colour when on. Defaults to the brand tint. */
  tint?: string;
  disabled?: boolean;
  /** Required: a switch carries no text of its own. */
  accessibilityLabel: string;
  /** Layout and positioning only; the control's own metrics are fixed. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A boolean toggle.
 *
 * iOS gets the platform `Switch` — the pill with the sliding white thumb —
 * which is already the right control. Android overrides this file with an
 * M3 switch, because RN's `Switch` still renders the Material 2 pill.
 */
export default function AppSwitch({
  value,
  onValueChange,
  tint,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: AppSwitchProps) {
  const COLORS = useTheme();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: tint ?? COLORS.BRAND, false: COLORS.BORDER }}
      accessibilityLabel={accessibilityLabel}
      style={style}
      testID={testID}
    />
  );
}
