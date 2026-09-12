import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * The bordered, rounded container that holds a run of {@link ModuleRow}s.
 *
 * This is the iOS grouped-list convention: one surface with a single outline,
 * rows divided by hairlines inside it — rather than a stack of individually
 * bordered cards, each drawing its own edge against the background.
 *
 * `overflow: 'hidden'` is what lets the first and last rows' press highlights
 * clip to the container's corners.
 */
export default function GroupContainer({
  style,
  children,
}: PropsWithChildren<Props>) {
  const COLORS = useTheme();

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
});
