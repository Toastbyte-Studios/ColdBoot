import React, { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * The container that holds a run of {@link ModuleRow}s.
 *
 * On iOS this is the grouped-list convention: one surface with a single
 * outline, rows divided by hairlines inside it — rather than a stack of
 * individually bordered cards, each drawing its own edge against the
 * background. `overflow: 'hidden'` is what lets the first and last rows' press
 * highlights clip to the container's corners.
 *
 * On Android it draws nothing. Material list items are full-bleed on the
 * screen's own surface: an outlined, inset container around them would be the
 * iOS idiom wearing Material colours, and it would also clip the ripple, which
 * is meant to run to the edge of the row.
 */
export default function GroupContainer({
  style,
  children,
}: PropsWithChildren<Props>) {
  const COLORS = useTheme();

  if (Platform.OS === 'android') {
    return <View style={[styles.flat, style]}>{children}</View>;
  }

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: COLORS.SURFACE, borderColor: COLORS.BORDER },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: RADIUS.group,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flat: {
    width: '100%',
  },
});
