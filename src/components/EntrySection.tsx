import React, { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING } from '../theme';
import { Text } from './ScaledText';
import SectionEyebrow from './SectionEyebrow';

const isAndroid = Platform.OS === 'android';

type SectionTone = 'default' | 'warning';

/**
 * One titled block of a long-form entry — Summary, Steps, Do Not, and so on.
 *
 * The surface matches the redesign's other cards (see `SolarCycleCard`): an
 * outlined `SURFACE` card on iOS, a flat `SURFACE_CONTAINER` on Android. Every
 * colour comes from the theme, which is the point — the old boxes painted a
 * themed fill behind untinted text, so the text stayed black on a background
 * that went dark.
 *
 * `warning` marks the Do Not block. On iOS it takes a 3pt error edge, the
 * same device `AlertsSheet` uses to name a card's source; on Android, where
 * Material puts colour in the fill rather than in a stripe, it takes the error
 * container. The label stays in the normal eyebrow colour on purpose: the
 * dark scheme's ERROR is 3.4:1 on the card, enough for an edge or a glyph but
 * not for 11pt text.
 *
 * Reference entries and scenario cards are the same kind of document, so they
 * render through the same section rather than each drawing its own headings.
 */
export function EntrySection({
  title,
  tone = 'default',
  children,
}: PropsWithChildren<{ title: string; tone?: SectionTone }>) {
  const COLORS = useTheme();
  const isWarning = tone === 'warning';

  const surface = isAndroid
    ? {
        backgroundColor: isWarning
          ? COLORS.ERROR_LIGHT
          : COLORS.SURFACE_CONTAINER,
      }
    : [
        styles.outlined,
        {
          backgroundColor: COLORS.SURFACE,
          borderColor: COLORS.BORDER,
        },
        isWarning && [styles.warningEdge, { borderLeftColor: COLORS.ERROR }],
      ];

  return (
    <View style={[styles.card, surface]}>
      <View style={styles.cardHeading}>
        {isWarning ? (
          <Ionicons
            name="close-circle-outline"
            size={15}
            color={COLORS.ERROR}
            style={styles.cardHeadingIcon}
          />
        ) : null}
        <SectionEyebrow inline style={styles.cardEyebrow}>
          {title}
        </SectionEyebrow>
      </View>
      {children}
    </View>
  );
}

/**
 * A list inside an {@link EntrySection}.
 *
 * Steps are a sequence, so they are numbered; everything else is an
 * unordered set and gets a dot. Each marker sits in its own column so a line
 * that wraps hangs under the text rather than under the marker, which the old
 * `• ` prefix could not do.
 */
export function EntryItemList({
  items,
  ordered = false,
}: {
  items: string[];
  ordered?: boolean;
}) {
  const COLORS = useTheme();

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listRow}>
          <View style={styles.marker}>
            {ordered ? (
              <Text style={[styles.markerNumber, { color: COLORS.BRAND }]}>
                {index + 1}
              </Text>
            ) : (
              <View style={[styles.dot, { backgroundColor: COLORS.MUTED }]} />
            )}
          </View>
          <Text style={[styles.body, styles.listText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** Body copy inside a section — exported so prose blocks match list items. */
export const entryBodyStyle = { fontSize: 16, lineHeight: 23 } as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    paddingTop: isAndroid ? 16 : 15,
    paddingHorizontal: isAndroid ? 18 : 17,
    paddingBottom: isAndroid ? 16 : 15,
    marginBottom: SPACING.md,
  },
  outlined: {
    borderWidth: 1,
  },
  warningEdge: {
    borderLeftWidth: 3,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeadingIcon: {
    marginRight: SPACING.xs + 2,
  },
  cardEyebrow: {
    marginBottom: 0,
  },
  body: entryBodyStyle,
  list: {
    gap: SPACING.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  marker: {
    width: 22,
    // Centres the marker on the first line: lineHeight 23, dot 5.
    minHeight: 23,
    justifyContent: 'center',
  },
  markerNumber: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  listText: {
    flex: 1,
  },
});
