import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { JSX, PropsWithChildren, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import referenceImages from '../../../assets/referenceImages';
import GroupContainer from '../../../components/GroupContainer';
import IconButton from '../../../components/IconButton';
import KnotStepCarousel from '../../../components/KnotStepCarousel';
import ModuleRow from '../../../components/ModuleRow';
import { Text } from '../../../components/ScaledText';
import SectionEyebrow from '../../../components/SectionEyebrow';
import StackScreen from '../../../components/StackScreen';
import { useTheme } from '../../../hooks/useTheme';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
} from '../../../stores/BookmarksStore';
import { RADIUS, SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../../theme';
import { ColorScheme } from '../../../theme/colors';
import { PAPER } from '../../../theme/fixedSurfaces';
import ReferenceEntryType from '../../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type EntryScreenRouteProp = RouteProp<
  { Entry: { entry: ReferenceEntryType } },
  'Entry'
>;

type SectionTone = 'default' | 'warning';

/**
 * One titled block of an entry — Summary, Steps, Do Not, and so on.
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
 */
function Section({
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
 * A list inside a {@link Section}.
 *
 * Steps are a sequence, so they are numbered; everything else is an
 * unordered set and gets a dot. Each marker sits in its own column so a line
 * that wraps hangs under the text rather than under the marker, which the old
 * `• ` prefix could not do.
 */
function ItemList({
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

/**
 * EntryScreen displays detailed information about a specific reference entry,
 * including its summary, steps, cautions ("Do Not"), things to watch for, and notes.
 *
 * The screen also allows users to bookmark or un-bookmark the entry from the
 * title row, the same place the Reference module keeps its bookmarks action.
 *
 * - If the entry is not found, a "Topic not found" message is shown.
 * - The bookmark state is managed and persisted using async storage helpers.
 * - The entry data is received via navigation route parameters.
 * - If an image exists for the entry in the asset map, it is displayed at the top.
 *
 * @returns {JSX.Element} The rendered EntryScreen component.
 */
export default function EntryScreen(): JSX.Element {
  const COLORS = useTheme();
  const route = useRoute<EntryScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const entry: ReferenceEntryType | null = route.params?.entry ?? null;

  const [bookmarked, setBookmarked] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      const entryId = entry?.id;
      if (entryId) setBookmarked(await isBookmarked(entryId));
    };
    check();
  }, [entry?.id]);

  /**
   * Toggles the bookmark state for the current entry.
   *
   * Returns early when there is no entry. Otherwise removes or adds the
   * bookmark (keyed by the entry's id, with its title and category) and then
   * syncs the local `bookmarked` state.
   */
  const toggleBookmark = async () => {
    if (!entry) return;
    if (bookmarked) {
      await removeBookmark(entry.id);
      setBookmarked(false);
    } else {
      await addBookmark({
        id: entry.id,
        title: entry.title,
        category: entry.category || '',
      });
      setBookmarked(true);
    }
  };

  if (!entry) {
    return (
      <StackScreen title="Topic not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          This topic isn't in the offline library. Go back and pick another.
        </Text>
      </StackScreen>
    );
  }

  // Get the SVG component for this entry if it exists (single-image fallback)
  const SvgComponent =
    entry.id && (!entry.images || entry.images.length === 0)
      ? referenceImages[entry.id]
      : null;

  const relatedLabel = entry.related_screen_label ?? 'Open reference tool';

  return (
    <StackScreen
      title={entry.title}
      subtitle={entry.category || undefined}
      trailing={
        <IconButton
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={COLORS.BRAND}
          accessibilityLabel={
            bookmarked ? 'Remove bookmark' : 'Bookmark this topic'
          }
          onPress={toggleBookmark}
        />
      }
    >
      <View style={styles.column}>
        {/* Multi-step image carousel for knots */}
        {entry.images && entry.images.length > 0 ? (
          <KnotStepCarousel images={entry.images} />
        ) : SvgComponent ? (
          /* The diagrams are dark line art on transparency, so the plate is
             fixed PAPER in both schemes — see src/theme/fixedSurfaces.ts. */
          <View
            style={[
              styles.imagePlate,
              !isAndroid && [styles.outlined, { borderColor: COLORS.BORDER }],
            ]}
          >
            <SvgComponent width="100%" height={200} />
          </View>
        ) : null}

        {!!entry.summary && (
          <Section title="Summary">
            <Text style={styles.body}>{entry.summary}</Text>
          </Section>
        )}

        {!!entry.steps?.length && (
          <Section title="Steps">
            <ItemList items={entry.steps} ordered />
          </Section>
        )}

        {!!entry.do_not?.length && (
          <Section title="Do not" tone="warning">
            <ItemList items={entry.do_not} />
          </Section>
        )}

        {!!entry.watch_for?.length && (
          <Section title="Watch for">
            <ItemList items={entry.watch_for} />
          </Section>
        )}

        {!!entry.notes?.length && (
          <Section title="Notes">
            <ItemList items={entry.notes} />
          </Section>
        )}
      </View>

      {!!entry.related_screen && (
        <GroupContainer style={styles.related}>
          <ModuleRow
            title={relatedLabel}
            icon="open-outline"
            variant="tool"
            showSeparator={false}
            onPress={() => navigation.navigate(entry.related_screen!)}
          />
        </GroupContainer>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  column: {
    // Android content is full-bleed (see StackScreen); cards carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
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
  body: {
    fontSize: 16,
    lineHeight: 23,
  },
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
  imagePlate: {
    backgroundColor: PAPER,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  related: {
    marginBottom: SPACING.md,
  },
});
