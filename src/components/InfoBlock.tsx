import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../theme';
import { cardSurface } from '../theme/cardSurface';
import { ColorScheme } from '../theme/colors';
import { withAlpha } from '../theme/colorUtils';
import { Text } from './ScaledText';

const isAndroid = Platform.OS === 'android';

export type InfoBlockTone = 'info' | 'tip' | 'caution';

type Props = {
  /**
   * The copy. A string (or a run of strings and nested `Text`) is set as body
   * text; anything else, such as a small list of rows, is laid out as given.
   */
  children: React.ReactNode;
  /**
   * What kind of aside this is. `info` explains how to read or use the
   * screen; `tip` is advice that goes beyond it; `caution` is a limit the
   * reader must not miss (a licence condition, an estimate that is not a
   * measurement). Defaults to `info`.
   */
  tone?: InfoBlockTone;
  /** A short bold lead-in, such as "Older code". Optional. */
  title?: string;
  /** Overrides the tone's Ionicons glyph. Use an `*-outline` name. */
  icon?: string;
  /**
   * Set when the block sits inside an already-inset column, so it doesn't
   * add the Android screen gutter a second time.
   */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

type Tone = {
  icon: string;
  /** iOS: the card's leading edge and the glyph. */
  edge: string;
  /** Android: the card's tonal fill. */
  fill: string;
  /** Android: the glyph on that fill. */
  glyph: string;
};

function toneFor(tone: InfoBlockTone, COLORS: ColorScheme): Tone {
  switch (tone) {
    case 'tip':
      return {
        icon: 'bulb-outline',
        edge: COLORS.SECONDARY_ACCENT,
        fill: COLORS.TERTIARY_CONTAINER,
        glyph: COLORS.ON_TERTIARY_CONTAINER,
      };
    case 'caution':
      return {
        icon: 'alert-circle-outline',
        edge: COLORS.ACCENT,
        fill: COLORS.ACCENT_CONTAINER,
        glyph: COLORS.ON_ACCENT_CONTAINER,
      };
    case 'info':
    default:
      return {
        icon: 'information-circle-outline',
        edge: COLORS.BRAND,
        fill: COLORS.SECONDARY_CONTAINER,
        glyph: COLORS.ON_SECONDARY_CONTAINER,
      };
  }
}

/** True when every child can sit inside a `Text`: strings, numbers, `Text`. */
function isTextContent(children: React.ReactNode): boolean {
  return React.Children.toArray(children).every(
    (child) =>
      typeof child === 'string' ||
      typeof child === 'number' ||
      (React.isValidElement(child) && child.type === Text),
  );
}

/**
 * A short explanatory aside — how to use a tool, what a dataset is, a tip —
 * set apart in a card with a glyph, instead of a paragraph on the bare
 * screen ground.
 *
 * Plain prose on the ground was hard to tell apart from the content it
 * qualified, and on iOS it needed the darker `MUTED_ON_GROUND` just to stay
 * legible over the gradient. A card fixes both: the reader can see at a
 * glance that this is guidance, and the text sits on a solid surface.
 *
 * The colour follows `AlertsSheet`: iOS takes the tone as a leading edge on
 * the standard outlined card and tints the glyph's tile; Android puts it in
 * the fill, since Material keeps colour off edge stripes. The text is ink on
 * both, which clears 4.5:1 on every fill in both schemes.
 *
 * Not for empty states ("No notes yet") or for a screen's actual content:
 * those stay as they are.
 */
export default function InfoBlock({
  children,
  tone = 'info',
  title,
  icon,
  inline,
  style,
}: Props) {
  const COLORS = useTheme();
  const t = toneFor(tone, COLORS);
  const glyph = isAndroid ? t.glyph : t.edge;

  return (
    <View
      accessible
      accessibilityRole="text"
      style={[
        styles.block,
        isAndroid && !inline && styles.gutter,
        isAndroid
          ? { ...cardSurface(COLORS), backgroundColor: t.fill }
          : cardSurface(COLORS, { accent: t.edge }),
        style,
      ]}
    >
      <View
        style={[
          styles.tile,
          {
            backgroundColor: isAndroid
              ? withAlpha(t.glyph, 0.12)
              : withAlpha(t.edge, 0.12),
          },
        ]}
      >
        <Ionicons name={icon ?? t.icon} size={18} color={glyph} />
      </View>
      <View style={styles.body}>
        {title ? (
          <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
            {title}
          </Text>
        ) : null}
        {isTextContent(children) ? (
          <Text style={[styles.text, { color: COLORS.PRIMARY_DARK }]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  gutter: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: SCREEN_GUTTER,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    // Centre a one-line note on the tile without pushing longer ones down.
    minHeight: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  text: {
    fontSize: 13.5,
    lineHeight: 19,
  },
});
