import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../theme';
import { Text } from './ScaledText';
import type { SegmentedControlProps } from './SegmentedControl';

/** M3 outlined segmented button: one 40dp row at the pill radius. */
const HEIGHT = 40;

/**
 * The Material 3 outlined segmented button.
 *
 * iOS renders `UISegmentedControl`, whose sliding selected segment is its
 * whole identity. Material does the opposite: nothing slides, the selected
 * segment takes a tonal fill and gains a leading check, and the segments are
 * divided by rules inside a single outline. The library's JS look-alike draws
 * the iOS control on both platforms, which is why this file exists.
 *
 * The check is not decoration — it is what keeps the selection legible when
 * the tonal fill is the only other cue, which is the case at every contrast
 * setting Android ships.
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
  const rippleColor = useRippleColor();

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.group, { borderColor: COLORS.BORDER }, style]}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;

        return (
          <React.Fragment key={option.value}>
            {index > 0 ? (
              <View style={[styles.rule, { backgroundColor: COLORS.BORDER }]} />
            ) : null}

            <Pressable
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              android_ripple={{ color: rippleColor }}
              style={[
                styles.segment,
                isSelected && {
                  backgroundColor: COLORS.SECONDARY_CONTAINER,
                },
              ]}
            >
              {isSelected ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.ON_SECONDARY_CONTAINER}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isSelected ? styles.labelSelected : styles.labelUnselected,
                  {
                    color: isSelected
                      ? COLORS.ON_SECONDARY_CONTAINER
                      : COLORS.PRIMARY_DARK,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    // Clips each segment's tonal fill and ripple to the group's own corners.
    overflow: 'hidden',
  },
  rule: {
    width: 1,
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: RADIUS.chip,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  labelSelected: {
    fontWeight: '600',
  },
  labelUnselected: {
    fontWeight: '500',
  },
});
