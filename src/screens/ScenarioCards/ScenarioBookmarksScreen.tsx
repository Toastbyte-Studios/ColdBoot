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
import scenarioData from '../../data/scenarioCards.json';
import { useTheme } from '../../hooks/useTheme';
import {
  getBookmarks,
  BookmarkItem,
  clearBookmarks,
} from '../../stores/BookmarksStore';
import { SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { ScenarioCardType } from '../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

/**
 * Displays a list of bookmarked scenario cards for the user.
 *
 * - Fetches bookmarks using `getBookmarks` and displays them in a grouped list.
 * - Navigates to the detailed view of a scenario when a bookmark is selected.
 * - Shows a helper message if there are no bookmarks.
 * - Reloads bookmarks whenever the screen gains focus.
 *
 * @component
 * @returns {JSX.Element} The rendered scenario bookmarks screen.
 */
export default function ScenarioBookmarksScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const COLORS = useTheme();

  // Create a Map for O(1) lookup performance instead of O(n) for each find operation
  // Using useMemo to lazily initialize only when component mounts
  const scenarioMap = useMemo(() => {
    const allScenarios = scenarioData.entries;

    // Development-time check for duplicate IDs
    if (__DEV__) {
      const ids = allScenarios.map((scenario) => scenario.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error(
          'Duplicate scenario IDs detected in scenarioCards.json. This may cause scenarios to be overwritten.',
        );
      }
    }

    return new Map<string, ScenarioCardType>(
      allScenarios.map((scenario) => [scenario.id, scenario]),
    );
  }, []);

  const load = useCallback(async () => {
    const list = await getBookmarks();
    // Filter to only show bookmarks that exist in scenario data
    const scenarioBookmarks = list.filter((item) => scenarioMap.has(item.id));
    setItems(scenarioBookmarks);
  }, [scenarioMap]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
  }, [navigation, load]);

  /**
   * Opens the bookmarked scenario associated with the given bookmark item.
   *
   * Looks up the corresponding scenario in {@link scenarioMap} using the bookmark's `id`.
   * If no scenario is found, logs a warning and exits without navigating.
   * Otherwise, navigates to the `ScenarioDetail` screen, passing the resolved scenario as a route param.
   *
   * @param item - The bookmark item whose associated scenario should be opened.
   */
  const handleOpen = (item: BookmarkItem) => {
    const scenario = scenarioMap.get(item.id);

    if (!scenario) {
      console.warn('Bookmarked scenario not found for id:', item.id);
      return;
    }

    navigation.navigate('ScenarioDetail', { scenario });
  };

  const sorted = items.slice().sort((a, b) => a.title.localeCompare(b.title));

  return (
    <StackScreen
      title="Bookmarked Scenarios"
      subtitle={
        sorted.length > 0
          ? `${sorted.length} saved scenario${sorted.length === 1 ? '' : 's'}`
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

      {sorted.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No bookmarked scenarios yet.
        </Text>
      ) : (
        <GroupContainer>
          {sorted.map((item, index) => (
            <ModuleRow
              key={item.id}
              title={item.title}
              icon="bookmark-outline"
              variant="tool"
              subtitle={item.category || undefined}
              showSeparator={index < sorted.length - 1}
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
