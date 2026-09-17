import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import {
  RADIUS,
  ROW_MIN_HEIGHT,
  ROW_PADDING_HORIZONTAL,
  ROW_PADDING_VERTICAL,
} from '../theme';
import { withAlpha } from '../theme/colorUtils';
import { Text } from './ScaledText';

const isAndroid = Platform.OS === 'android';

/**
 * Leading-icon sizes, and the separator inset that aligns with each one's
 * title.
 *
 * The inset is row padding + icon + gap, so the divider starts under the first
 * letter of the title rather than at the row edge. Both platforms do this;
 * they disagree on everything else.
 *
 * iOS distinguishes a Home module row from a tool row inside a module by two
 * points of tile size. Material does not: a list item is a list item, so both
 * variants resolve to the same 40dp circle and 72dp inset.
 */
const TILE = Platform.select({
  android: {
    module: { size: 40, radius: 20, glyph: 22, separatorInset: 72 },
    tool: { size: 40, radius: 20, glyph: 22, separatorInset: 72 },
  },
  default: {
    /** Module rows on Home. */
    module: { size: 36, radius: RADIUS.tile, glyph: 20, separatorInset: 63 },
    /** Tool rows inside a module. */
    tool: { size: 34, radius: RADIUS.tileSmall, glyph: 19, separatorInset: 61 },
  },
})!;

export type ModuleRowProps = {
  title: string;
  /** Ionicons glyph name — always an `-outline` variant. */
  icon: string;
  subtitle?: string;
  /** Right-aligned value, shown before the chevron. Only when a store has the number. */
  value?: string;
  onPress?: () => void;
  /** `module` is the Home row; `tool` the row inside a module. @default 'module' */
  variant?: keyof typeof TILE;
  /** Draws the divider below this row. Pass `false` for the last row in a group. */
  showSeparator?: boolean;
};

/**
 * One row in a list: leading icon, title over optional subtitle, optional
 * value, and — on iOS — a chevron.
 *
 * Replaces the gradient `CardTopic` on Home and in the module screens. Three
 * deliberate departures from that component:
 *
 * - **No scale bounce.** `CardTopic` shrank to 0.94 on press, which reads as a
 *   toy. Native feedback is a highlight on iOS and a ripple on Android, and
 *   both survive Dynamic Type — a transform does not reflow, so a scaled-up
 *   row would clip.
 * - **Theme-aware.** Every color resolves through `useTheme()`, so the row
 *   inverts with the scheme instead of painting one fixed gradient in both.
 * - **No chevron on Android.** Material list items do not carry one; the row
 *   being tappable is conveyed by the ripple, not by a glyph.
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
  const rippleColor = useRippleColor();
  const tile = TILE[variant];

  const accessibilityLabel = subtitle ? `${title}. ${subtitle}` : title;

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          styles.row,
          !isAndroid &&
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
                backgroundColor: isAndroid
                  ? COLORS.SECONDARY_CONTAINER
                  : withAlpha(COLORS.BRAND, 0.1),
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={tile.glyph}
              color={isAndroid ? COLORS.ON_SECONDARY_CONTAINER : COLORS.BRAND}
            />
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
          {isAndroid ? null : (
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
          )}
        </View>
      </Pressable>

      {showSeparator ? (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: isAndroid
                ? COLORS.OUTLINE_VARIANT
                : COLORS.SEPARATOR,
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
    gap: isAndroid ? 16 : 13,
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
    fontSize: isAndroid ? 16 : 16.5,
    // iOS specifies weight 590, which RN does not accept; Material asks for
    // 500 and means it.
    fontWeight: isAndroid ? '500' : '600',
    letterSpacing: isAndroid ? 0 : -0.2,
  },
  subtitle: {
    fontSize: isAndroid ? 14 : 12.5,
    fontWeight: '400',
  },
  value: {
    fontSize: isAndroid ? 13 : 13.5,
    fontWeight: '400',
    flexShrink: 0,
  },
  separator: {
    height: isAndroid
      ? 1
      : StyleSheet.hairlineWidth < 0.5
        ? 0.5
        : StyleSheet.hairlineWidth,
  },
});
