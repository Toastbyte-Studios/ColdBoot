import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import emergencyData from '../../data/emergency.json';
import healthData from '../../data/health.json';
import survivalData from '../../data/survival.json';
import toolsData from '../../data/tools.json';
import weatherData from '../../data/weather.json';
import { useTheme } from '../../hooks/useTheme';
import {
  getBookmarks,
  BookmarkItem,
  clearBookmarks,
} from '../../stores/BookmarksStore';
import { SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import ReferenceEntryType from '../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

/**
 * Displays a list of bookmarked health entries for the user.
 *
 * - Fetches bookmarks using `getBookmarks` and lists them as rows in one grouped list.
 * - Navigates to the detailed view of a health entry when a bookmark is selected.
 * - Shows a helper message if there are no bookmarks.
 * - Reloads bookmarks whenever the screen gains focus.
 *
 * @component
 * @returns {JSX.Element} The rendered bookmark screen.
 */
export default function BookmarkScreen(): JSX.Element {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [items, setItems] = useState<BookmarkItem[]>([]);

  // Create a Map for O(1) lookup performance instead of O(n) for each find operation
  // Using useMemo to lazily initialize only when component mounts
  const entryMap = useMemo(() => {
    const allEntries = [
      ...emergencyData.entries,
      ...healthData.entries,
      ...survivalData.entries,
      ...toolsData.entries,
      ...weatherData.entries,
    ];

    // Development-time check for duplicate IDs
    if (__DEV__) {
      const ids = allEntries.map((entry) => entry.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error(
          'Duplicate entry IDs detected across data sources. This may cause entries to be overwritten.',
        );
      }
    }

    return new Map<string, ReferenceEntryType>(
      allEntries.map((entry) => [entry.id, entry]),
    );
  }, []);

  const load = useCallback(async () => {
    const list = await getBookmarks();
    // Filter to only show bookmarks that exist in reference data
    const referenceBookmarks = list.filter((item) => entryMap.has(item.id));
    setItems(referenceBookmarks);
  }, [entryMap]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
  }, [navigation, load]);

  /**
   * Opens the bookmarked entry associated with the given bookmark item.
   *
   * Looks up the corresponding entry in {@link entryMap} using the bookmark's `id`.
   * If no entry is found, logs a warning and exits without navigating.
   * Otherwise, navigates to the `Entry` screen, passing the resolved entry as a route param.
   *
   * @param item - The bookmark item whose associated entry should be opened.
   */
  const handleOpen = (item: BookmarkItem) => {
    const entry = entryMap.get(item.id);

    if (!entry) {
      console.warn('Bookmark entry not found for id:', item.id);
      return;
    }

    navigation.navigate('Entry', { entry });
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.title.localeCompare(b.title)),
    [items],
  );

  return (
    <StackScreen
      title="Bookmarks"
      subtitle={
        items.length > 0
          ? `${items.length} saved topic${items.length === 1 ? '' : 's'}`
          : undefined
      }
    >
      {/* DEV ONLY - Clear all bookmarks */}
      {__DEV__ && (
        <Text
          onPress={async () => {
            await clearBookmarks();
            await load();
          }}
          style={[styles.dev, { color: groundInk(COLORS) }]}
        >
          Clear all bookmarks (dev)
        </Text>
      )}
      {/* END DEV ONLY */}

      {sortedItems.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No bookmarks yet. Tap the bookmark on any reference topic to keep it
          here.
        </Text>
      ) : (
        <GroupContainer>
          {sortedItems.map((item, index) => (
            <ModuleRow
              key={item.id}
              title={item.title}
              icon="bookmark-outline"
              variant="tool"
              subtitle={item.category || undefined}
              showSeparator={index < sortedItems.length - 1}
              onPress={() => handleOpen(item)}
            />
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  dev: {
    marginBottom: SPACING.sm,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
