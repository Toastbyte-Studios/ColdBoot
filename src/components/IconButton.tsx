import React from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { withAlpha } from '../theme/colorUtils';

/**
 * Minimum touch target: 44pt per the iOS HIG, 48dp per Material. The glyph
 * inside is smaller; the target is what the finger gets.
 */
const TARGET = Platform.OS === 'ios' ? 44 : 48;

export interface IconButtonProps {
  /** Ionicons glyph name. */
  name: string;
  /**
   * Required. An icon carries no text for screen readers, so there is no
   * sensible default to fall back to.
   */
  accessibilityLabel: string;
  /**
   * Receives the press event so nested icon buttons inside a tappable row can
   * call `stopPropagation()`.
   */
  onPress: (event: GestureResponderEvent) => void;
  /** Glyph size in points. The touch target stays at 44/48 regardless. @default 24 */
  size?: number;
  /** Glyph color. Defaults to the theme foreground. */
  color?: string;
  /**
   * Glyph color while disabled. Defaults to the theme's muted color, which is
   * right on a plain background and wrong on a tinted one — override it when
   * the button sits on a filled surface that dims as a whole.
   */
  disabledColor?: string;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Layout and positioning only; the target size is fixed. */
  style?: StyleProp<ViewStyle>;
  /** Unbounded ripple, for circular toolbar-style targets. @default true */
  borderless?: boolean;
  testID?: string;
}

/**
 * Borderless icon button for header and toolbar chrome.
 *
 * Android gets the circular borderless ripple used by real toolbar icons; iOS
 * gets the deeper dim that bar button items use. Both get a full-size touch
 * target regardless of how small the glyph is.
 */
export default function IconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 24,
  color,
  disabledColor,
  disabled = false,
  accessibilityHint,
  style,
  borderless = true,
  testID,
}: IconButtonProps) {
  const COLORS = useTheme();
  const tint = disabled
    ? (disabledColor ?? COLORS.MUTED)
    : (color ?? COLORS.PRIMARY_DARK);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={8}
      android_ripple={
        disabled
          ? undefined
          : {
              color: withAlpha(tint, 0.16),
              borderless,
              radius: TARGET / 2,
            }
      }
      style={({ pressed }) => [
        styles.base,
        Platform.OS === 'ios' && pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Icon name={name} size={size} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: TARGET,
    minHeight: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.4,
  },
});
