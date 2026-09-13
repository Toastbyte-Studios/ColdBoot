import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { onColor } from '../theme/colorUtils';
import type { AppSwitchProps } from './AppSwitch';

/**
 * Material 3 switch metrics. The thumb grows as it travels: 16dp resting in
 * the off state, 24dp once the switch is on, which is the size change that
 * makes the state readable without relying on the track colour alone.
 */
const TRACK = { width: 52, height: 32, border: 2 };
const THUMB = { off: 16, on: 24 };

/**
 * How far the thumb sits from the left edge of the track's *content* box — the
 * area inside the 2dp outline, which is where the thumb is laid out. Off, it
 * is inset by the same amount all round; on, it is pushed to the far end with
 * that same inset on the right.
 */
const CONTENT = {
  width: TRACK.width - TRACK.border * 2,
  height: TRACK.height - TRACK.border * 2,
};
const OFFSET = {
  off: (CONTENT.height - THUMB.off) / 2,
  on: CONTENT.width - THUMB.on - (CONTENT.height - THUMB.on) / 2,
};

/** M3 `emphasized` easing, as a cubic-bezier RN can build. */
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
const DURATION_MS = 150;

/**
 * The Material 3 switch.
 *
 * RN's own `Switch` renders the Material 2 pill on Android — a thin track with
 * a thumb that overhangs it — so the control is drawn here instead. Off is an
 * outlined, unfilled track with a small muted thumb; on is a filled track with
 * a large thumb in the fill's own on-colour.
 *
 * Everything that is not geometry comes from the theme, so the switch inverts
 * with the scheme like the rest of the interface.
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
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  // A switch is rendered in its state, not animated into it: only a change
  // after mount is a transition worth showing.
  const isMounting = useRef(true);

  useEffect(() => {
    if (isMounting.current) {
      isMounting.current = false;
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: DURATION_MS,
      easing: EMPHASIZED,
      // Drives width and background colour, which the native driver cannot
      // animate.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, value]);

  const trackTint = tint ?? COLORS.BRAND;

  // Built here rather than inline: the off state is an unfilled, outlined
  // track, and the on state fills it and drops the outline into the fill.
  const trackTone = {
    backgroundColor: value ? trackTint : 'transparent',
    borderColor: value ? trackTint : COLORS.BORDER,
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [OFFSET.off, OFFSET.on],
  });
  const thumbSize = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB.off, THUMB.on],
  });

  return (
    <Pressable
      testID={testID}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      style={[styles.pressable, disabled && styles.disabled, style]}
    >
      <View
        // Derived rather than passed, so a caller that identifies the switch
        // also gets a handle on the part that carries the state.
        testID={testID ? `${testID}-track` : undefined}
        style={[styles.track, trackTone]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: THUMB.on / 2,
              backgroundColor: value ? onColor(trackTint) : COLORS.MUTED,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.38,
  },
  track: {
    width: TRACK.width,
    height: TRACK.height,
    borderRadius: TRACK.height / 2,
    borderWidth: TRACK.border,
    flexDirection: 'row',
    // The thumb is centred vertically by the track and moved horizontally by
    // `translateX`, so its growing height never needs a matching offset.
    alignItems: 'center',
  },
  thumb: {
    // Laid out at the track's left edge and moved by `translateX`, so the
    // travel is one animated value rather than an animated `left`.
    marginLeft: 0,
  },
});
