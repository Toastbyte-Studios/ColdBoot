import React from 'react';
import { Platform, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TEXT_GUTTER } from '../theme';
import { Text } from './ScaledText';

const isAndroid = Platform.OS === 'android';

type Props = {
  children: string;
  /**
   * Set for an eyebrow inside a card or sheet, which is already inset by its
   * own padding. Without it the eyebrow carries the screen gutter, which is
   * what a section label sitting on the bare screen needs.
   */
  inline?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * The small uppercase label that names a group — "MODULES", "TOOLS",
 * "APPEARANCE".
 *
 * Deliberately quiet: it is a signpost between groups, not a heading competing
 * with the screen title. Each screen has exactly one large title; every other
 * band of content is introduced by one of these.
 *
 * Quiet means something different on each platform. iOS greys it out; Material
 * tints it with `primary` and lets the size and tracking do the receding, so
 * that on Android it reads as a label belonging to the list below rather than
 * as an afterthought above it.
 */
export default function SectionEyebrow({ children, inline, style }: Props) {
  const COLORS = useTheme();

  return (
    <Text
      style={[
        styles.eyebrow,
        isAndroid && !inline && styles.gutter,
        { color: isAndroid ? COLORS.BRAND : COLORS.MUTED },
        style,
      ]}
    >
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    // 0.1em (Android) / 0.09em (iOS) at 11px. RN letterSpacing is in points.
    letterSpacing: isAndroid ? 1.1 : 0.99,
    marginBottom: SPACING.sm,
  },
  gutter: {
    // The design's `20 20 8`. Only a section label on the bare screen takes
    // it: one inside a card is already inset by the card's own padding, and
    // the leading space belongs to the card.
    paddingTop: TEXT_GUTTER,
    paddingHorizontal: TEXT_GUTTER,
  },
});
