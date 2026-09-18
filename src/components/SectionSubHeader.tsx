import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { onColor } from '../theme/colorUtils';
import { Text } from './ScaledText';

type Props = TextProps & { title?: string };

/**
 * Renders a section sub header using a `Text` component.
 *
 * Displays either the provided `title` prop or the `children` as the header content.
 * Additional styles can be applied via the `style` prop, and other props are spread onto the `Text` component.
 *
 * @param title - The text to display as the section sub header. If not provided, `children` will be used.
 * @param children - Alternative content to display if `title` is not specified.
 * @param style - Custom styles to apply to the header.
 * @param rest - Additional props to pass to the `Text` component.
 *
 * The label colour is picked against the teal fill with `onColor`. It used to
 * be `PRIMARY_DARK`, which is ink on the light scheme's dark teal (2.9:1) and
 * pale ice on the dark scheme's light teal (2.6:1) — below 4.5:1 in both.
 */
export default function SectionSubHeader({
  title,
  children,
  style,
  ...rest
}: Props) {
  const COLORS = useTheme();

  return (
    <Text
      {...rest}
      style={[
        styles.header,
        {
          color: onColor(COLORS.SECONDARY_ACCENT),
          backgroundColor: COLORS.SECONDARY_ACCENT,
          borderColor: COLORS.BRAND,
        },
        style,
      ]}
    >
      {title ?? children}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 14,
    fontFamily: 'Bitter-Bold',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 300,
    textAlign: 'center',
    alignSelf: 'center',
    marginVertical: 4,
  },
});
