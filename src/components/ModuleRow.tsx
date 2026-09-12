import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import {
  RADIUS,
  ROW_MIN_HEIGHT,
  ROW_PADDING_HORIZONTAL,
  ROW_PADDING_VERTICAL,
} from '../theme';
import { withAlpha } from '../theme/colorUtils';
import { Text } from './ScaledText';

/**
 * Tile sizes, and the separator inset that aligns with each one's title.
 *
 * The inset is row padding + tile + gap, so the hairline starts under the
 * first letter of the title rather than at the row edge — the iOS grouped-list
 * convention, which reads as "these rows belong to one list" instead of
 * "these rows are separate slabs".
 */
const TILE = {
  /** Module rows on Home. */
  module: { size: 36, radius: RADIUS.tile, glyph: 20, separatorInset: 63 },
  /** Tool rows inside a module. */
  tool: { size: 34, radius: RADIUS.tileSmall, glyph: 19, separatorInset: 61 },
} as const;

export type ModuleRowProps = {
  title: string;
  /** Ionicons glyph name — always an `-outline` variant. */
  icon: string;
  subtitle?: string;
  /** Right-aligned value, shown before the chevron. Only when a store has the number. */
  value?: string;
  onPress?: () => void;
  /** `module` is the 36px Home tile; `tool` the 34px tile inside a module. @default 'module' */
  variant?: keyof typeof TILE;
  /** Draws the hairline below this row. Pass `false` for the last row in a group. */
  showSeparator?: boolean;
};

/**
 * One row in a grouped list: icon tile, title over optional subtitle, optional
 * value, chevron.
 *
 * Replaces the gradient `CardTopic` on Home and in the module screens. Two
 * deliberate departures from that component:
 *
 * - **No scale bounce.** `CardTopic` shrank to 0.94 on press, which reads as a
 *   toy. A background highlight is the native behaviour, and it survives
 *   Dynamic Type — a transform does not reflow, so a scaled-up row would clip.
 * - **Theme-aware.** Every color resolves through `useTheme()`, so the row
 *   inverts with the scheme instead of painting one fixed gradient in both.
 *
 * Accessibility: the row is a single button labelled with its title; the inner
 * view is hidden from assistive tech so the icon and subtitle are not
 * announced as separate elements.
 */
export default function ModuleRow({
  title,
  icon,
  subtitle,
  value,
  onPress,
  variant = 'module',
  showSeparator = true,
}: ModuleRowProps) {
  const COLORS = useTheme();
  const tile = TILE[variant];

  const accessibilityLabel = subtitle ? `${title}. ${subtitle}` : title;

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{ color: withAlpha(COLORS.BRAND, 0.08) }}
        style={({ pressed }) => [
          styles.row,
          Platform.OS === 'ios' &&
            pressed && { backgroundColor: withAlpha(COLORS.BRAND, 0.06) },
        ]}
      >
        <View style={styles.inner} accessible={false}>
          <View
            style={[
              styles.tile,
              {
                width: tile.size,
                height: tile.size,
                borderRadius: tile.radius,
                backgroundColor: withAlpha(COLORS.BRAND, 0.1),
              },
            ]}
          >
            <Ionicons name={icon} size={tile.glyph} color={COLORS.BRAND} />
          </View>

          <View style={styles.labels}>
            <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: COLORS.MUTED }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {value ? (
            <Text style={[styles.value, { color: COLORS.MUTED }]}>{value}</Text>
          ) : null}

          {/* Ionicons' chevron is heavier than the 2px hairline the design
              calls for, so it is drawn directly. */}
          <Svg width={8} height={14} viewBox="0 0 8 14">
            <Path
              d="M1 1L7 7L1 13"
              stroke={COLORS.CHEVRON}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </Pressable>

      {showSeparator ? (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: COLORS.SEPARATOR,
              marginLeft: tile.separatorInset,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    // Height is a floor, not a fixed value: the row grows with Dynamic Type
    // rather than truncating its labels.
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: 'center',
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingHorizontal: ROW_PADDING_HORIZONTAL,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16.5,
    // The design specifies weight 590, which RN does not accept.
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '400',
  },
  value: {
    fontSize: 13.5,
    fontWeight: '400',
    flexShrink: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth,
  },
});
