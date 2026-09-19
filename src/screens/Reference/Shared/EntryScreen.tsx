import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { JSX, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import referenceImages from '../../../assets/referenceImages';
import {
  EntryItemList,
  EntrySection,
  entryBodyStyle,
} from '../../../components/EntrySection';
import GroupContainer from '../../../components/GroupContainer';
import IconButton from '../../../components/IconButton';
import KnotStepCarousel from '../../../components/KnotStepCarousel';
import ModuleRow from '../../../components/ModuleRow';
import { Text } from '../../../components/ScaledText';
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
          <EntrySection title="Summary">
            <Text style={styles.body}>{entry.summary}</Text>
          </EntrySection>
        )}

        {!!entry.steps?.length && (
          <EntrySection title="Steps">
            <EntryItemList items={entry.steps} ordered />
          </EntrySection>
        )}

        {!!entry.do_not?.length && (
          <EntrySection title="Do not" tone="warning">
            <EntryItemList items={entry.do_not} />
          </EntrySection>
        )}

        {!!entry.watch_for?.length && (
          <EntrySection title="Watch for">
            <EntryItemList items={entry.watch_for} />
          </EntrySection>
        )}

        {!!entry.notes?.length && (
          <EntrySection title="Notes">
            <EntryItemList items={entry.notes} />
          </EntrySection>
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
  body: entryBodyStyle,
  outlined: {
    borderWidth: 1,
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
