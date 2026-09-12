import React from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme';
import { Text } from './ScaledText';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
};

/**
 * The small uppercase label that names a group — "MODULES", "TOOLS",
 * "APPEARANCE".
 *
 * Deliberately quiet: it is a signpost between groups, not a heading competing
 * with the screen title. Each screen has exactly one large title; every other
 * band of content is introduced by one of these.
 */
export default function SectionEyebrow({ children, style }: Props) {
  const COLORS = useTheme();

  return (
    <Text style={[styles.eyebrow, { color: COLORS.MUTED }, style]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    // 0.09em at 11px. RN letterSpacing is in points, not ems.
    letterSpacing: 0.99,
    marginBottom: SPACING.sm,
  },
});
