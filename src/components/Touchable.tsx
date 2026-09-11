import React from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { withAlpha } from '../theme/colorUtils';

export interface TouchableProps extends Omit<
  PressableProps,
  'style' | 'android_ripple'
> {
  /**
   * Forwarded to the underlying Pressable. React 19 passes `ref` to function
   * components as an ordinary prop, so it arrives in `...rest`. Used by
   * SectionHeader, whose header is a tutorial spotlight target.
   */
  ref?: React.Ref<View>;
  style?: StyleProp<ViewStyle>;
  /** Ripple tint on Android. Defaults to the theme foreground. */
  rippleColor?: string;
  /** Unbounded ripple, for round or icon-shaped targets. @default false */
  borderless?: boolean;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for `TouchableOpacity` that gives each platform its own
 * press feedback: a ripple on Android, a dim on iOS.
 *
 * Use this for tappable regions that are not buttons — list rows, cards,
 * expandable items. For an action with a label use `AppButton`; for a bare
 * glyph use `IconButton`.
 *
 * The Android ripple is drawn in the foreground rather than behind the
 * content, so it works without forcing `overflow: 'hidden'` on the container.
 * That matters here because several call sites position children outside their
 * own bounds (badges, close buttons) and clipping would swallow them.
 */
export default function Touchable({
  style,
  rippleColor,
  borderless = false,
  disabled,
  children,
  ...rest
}: TouchableProps) {
  const COLORS = useTheme();
  const tint = rippleColor ?? COLORS.PRIMARY_DARK;

  return (
    <Pressable
      disabled={disabled}
      android_ripple={
        disabled
          ? undefined
          : {
              color: withAlpha(tint, 0.12),
              borderless,
              foreground: !borderless,
            }
      }
      style={({ pressed }) => [
        Platform.OS === 'ios' && pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
});
