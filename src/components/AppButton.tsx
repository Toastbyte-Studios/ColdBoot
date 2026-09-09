import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../theme/colors';
import { onColor, withAlpha } from '../theme/colorUtils';
import { Text } from './ScaledText';

/**
 * Button styles map to the platform's own button vocabulary rather than to
 * brand roles:
 *
 * - `filled`      — solid tint, white/ink label. iOS `.filled`, Android filled.
 * - `tinted`      — 12% tint wash, tint-colored label. iOS `.tinted`, Android tonal.
 * - `plain`       — no chrome, tint-colored label. iOS `.plain`, Android text button.
 * - `destructive` — filled with the error tint.
 *
 * `primary` / `secondary` / `success` are kept as aliases so existing call
 * sites keep working while screens are migrated.
 */
export type ButtonVariant =
  | 'filled'
  | 'tinted'
  | 'plain'
  | 'destructive'
  | 'primary'
  | 'secondary'
  | 'success';

export type ButtonSize = 'small' | 'medium' | 'large';

export interface AppButtonProps {
  /** Button label. Use a verb that matches what happens: "Save changes", not "Submit". */
  label: string;
  onPress: () => void;
  /** @default 'filled' */
  variant?: ButtonVariant;
  /** @default 'medium' */
  size?: ButtonSize;
  /** Ionicons name rendered before the label. */
  icon?: string;
  /** Overrides the size-derived icon size. */
  iconSize?: number;
  /** Non-interactive and visually recessed. */
  disabled?: boolean;
  /** Swaps the label for a spinner and blocks presses. */
  loading?: boolean;
  /** Stretches to the full width of the parent. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Falls back to `label`. */
  accessibilityLabel?: string;
  testID?: string;
}

/* -------------------------------------------------------------------------- */
/* Platform metrics                                                            */
/* -------------------------------------------------------------------------- */

const METRICS = Platform.select({
  ios: {
    radius: { small: 8, medium: 10, large: 12 },
    minHeight: { small: 34, medium: 44, large: 50 },
    paddingX: { small: 12, medium: 16, large: 20 },
    fontSize: { small: 14, medium: 16, large: 17 },
    iconSize: { small: 16, medium: 19, large: 21 },
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.4,
    gap: 6,
  },
  default: {
    // Material 3: pill-shaped, 48dp target, medium weight, positive tracking.
    radius: { small: 18, medium: 24, large: 28 },
    minHeight: { small: 36, medium: 48, large: 56 },
    paddingX: { small: 16, medium: 24, large: 28 },
    fontSize: { small: 14, medium: 15, large: 16 },
    iconSize: { small: 18, medium: 20, large: 22 },
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
    gap: 8,
  },
})!;

/* -------------------------------------------------------------------------- */
/* Variant resolution                                                          */
/* -------------------------------------------------------------------------- */

type ResolvedStyle = 'filled' | 'tinted' | 'plain';

function resolveVariant(
  variant: ButtonVariant,
  colors: ThemeColors,
): { kind: ResolvedStyle; tint: string } {
  switch (variant) {
    case 'primary':
    case 'filled':
      return { kind: 'filled', tint: colors.ACCENT };
    case 'success':
      return { kind: 'filled', tint: colors.SUCCESS };
    case 'destructive':
      return { kind: 'filled', tint: colors.ERROR };
    case 'secondary':
    case 'tinted':
      return { kind: 'tinted', tint: colors.BRAND };
    case 'plain':
      return { kind: 'plain', tint: colors.BRAND };
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function AppButton({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  icon,
  iconSize,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  labelStyle,
  accessibilityLabel,
  testID,
}: AppButtonProps) {
  const COLORS = useTheme();
  const inactive = disabled || loading;

  const { container, contentColor, ripple } = useMemo(() => {
    const { kind, tint } = resolveVariant(variant, COLORS);

    if (disabled) {
      return {
        container:
          kind === 'filled'
            ? { backgroundColor: COLORS.BORDER }
            : { backgroundColor: 'transparent' },
        contentColor: COLORS.MUTED,
        ripple: 'transparent',
      };
    }

    switch (kind) {
      case 'filled':
        return {
          container: { backgroundColor: tint },
          contentColor: onColor(tint),
          ripple: withAlpha(onColor(tint), 0.16),
        };
      case 'tinted':
        return {
          container: { backgroundColor: withAlpha(tint, 0.12) },
          contentColor: tint,
          ripple: withAlpha(tint, 0.16),
        };
      case 'plain':
        return {
          container: { backgroundColor: 'transparent' },
          contentColor: tint,
          ripple: withAlpha(tint, 0.16),
        };
    }
  }, [variant, disabled, COLORS]);

  const resolvedIconSize = iconSize ?? METRICS.iconSize[size];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      android_ripple={
        inactive ? undefined : { color: ripple, foreground: true }
      }
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: METRICS.minHeight[size],
          borderRadius: METRICS.radius[size],
          paddingHorizontal: METRICS.paddingX[size],
          gap: METRICS.gap,
        },
        container,
        fullWidth && styles.fullWidth,
        // iOS dims on press; Android uses the ripple above and stays put.
        Platform.OS === 'ios' && pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} size={resolvedIconSize} color={contentColor} />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              {
                color: contentColor,
                fontSize: METRICS.fontSize[size],
                fontWeight: METRICS.fontWeight,
                letterSpacing: METRICS.letterSpacing,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    // Required on Android so the ripple is clipped to the corner radius.
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
});
