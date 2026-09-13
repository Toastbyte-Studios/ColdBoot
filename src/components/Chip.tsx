import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../theme';
import { Text } from './ScaledText';

export type ChipTone = 'secondary' | 'tertiary';

export type ChipProps = {
  label: string;
  /**
   * Leading dot, in the colour of whatever the chip reports on. Outlined chips
   * use it as a category marker; filled chips carry an icon instead.
   */
  dotColor?: string;
  /** Ionicons glyph before the label. */
  icon?: string;
  /** Filled tonal chip rather than outlined. */
  selected?: boolean;
  /**
   * Which container a filled chip takes. `tertiary` is the confirmed state —
   * "GPS locked" — and `secondary` everything else. @default 'secondary'
   */
  tone?: ChipTone;
  /** Omit to render a read-only chip, which is not exposed as a button. */
  onPress?: () => void;
  /** Falls back to the label. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A Material 3 assist/filter chip.
 *
 * Android's answer to the iOS pass's divided stat row: where iOS separates
 * values with hairlines inside one card, Material gives each value its own
 * small container, so a value can be tinted by what it means — teal for a
 * confirmed fix, outlined for a plain reading — without the row having to
 * become a table.
 *
 * `flexShrink: 0` and a single-line label are deliberate. Three chips only
 * just fit a 412dp screen, so the row that holds them has to scroll rather
 * than let a longer reading wrap into a second line.
 */
export default function Chip({
  label,
  dotColor,
  icon,
  selected = false,
  tone = 'secondary',
  onPress,
  accessibilityLabel,
  style,
}: ChipProps) {
  const COLORS = useTheme();
  const rippleColor = useRippleColor();

  const fill =
    tone === 'tertiary'
      ? COLORS.TERTIARY_CONTAINER
      : COLORS.SECONDARY_CONTAINER;
  const ink =
    tone === 'tertiary'
      ? COLORS.ON_TERTIARY_CONTAINER
      : COLORS.ON_SECONDARY_CONTAINER;

  const content = (
    <>
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? ink : COLORS.PRIMARY_DARK}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.label, { color: selected ? ink : COLORS.PRIMARY_DARK }]}
      >
        {label}
      </Text>
    </>
  );

  const chipStyle = [
    styles.chip,
    selected
      ? { backgroundColor: fill }
      : { borderWidth: 1, borderColor: COLORS.BORDER },
    style,
  ];

  if (!onPress) {
    return (
      <View style={chipStyle} accessibilityLabel={accessibilityLabel ?? label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      android_ripple={{ color: rippleColor }}
      style={chipStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // A floor, not a height: the chip grows with the font scale.
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: RADIUS.chip,
    // Chips live in a scrolling row and must never be squeezed by it.
    flexShrink: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
