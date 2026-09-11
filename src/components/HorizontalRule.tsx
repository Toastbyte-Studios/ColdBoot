import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * Renders a simple horizontal divider for separating content sections.
 *
 * @remarks
 * This component currently returns a single `View` styled via `styles.horizontalLine`.
 *
 * @returns A React element representing the horizontal rule.
 */
export function HorizontalRule() {
  const COLORS = useTheme();

  return (
    <View
      style={[
        styles.horizontalLine,
        { backgroundColor: COLORS.SECONDARY_ACCENT },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontalLine: {
    width: '100%',
    height: 1,
    opacity: 0.5,
    alignItems: 'center',
  },
});
