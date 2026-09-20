import { RouteProp, useRoute } from '@react-navigation/native';
import React, { JSX, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  EntryItemList,
  EntrySection,
  entryBodyStyle,
} from '../../components/EntrySection';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
} from '../../stores/BookmarksStore';
import { SCREEN_GUTTER, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { ScenarioCardType } from '../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type ScenarioDetailScreenRouteProp = RouteProp<
  { ScenarioDetail: { scenario: ScenarioCardType } },
  'ScenarioDetail'
>;

/**
 * ScenarioDetailScreen displays detailed information about a specific emergency scenario,
 * including the situation, immediate risks, actions for first 5 minutes, first hour, first day,
 * things to watch for, and notes.
 *
 * The screen also allows users to bookmark or un-bookmark the scenario.
 *
 * A scenario card and a Reference entry are the same kind of document — a
 * titled block of prose followed by lists — so this renders through the same
 * `EntrySection` and `EntryItemList` the Reference entry screen uses, rather
 * than through its own headings and text bullets.
 *
 * - If the scenario is not found, a "Scenario not found" message is shown.
 * - The bookmark state is managed and persisted using async storage helpers.
 * - The scenario data is received via navigation route parameters.
 *
 * @returns {JSX.Element} The rendered ScenarioDetailScreen component.
 */
export default function ScenarioDetailScreen(): JSX.Element {
  const COLORS = useTheme();
  const route = useRoute<ScenarioDetailScreenRouteProp>();
  const { scenario: routeScenario } = route.params || {};

  const resolvedScenario: ScenarioCardType | null = useMemo(() => {
    if (routeScenario) return routeScenario as ScenarioCardType;
    return null;
  }, [routeScenario]);

  const [bookmarked, setBookmarked] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      const scenarioId = resolvedScenario?.id;
      if (scenarioId) setBookmarked(await isBookmarked(scenarioId));
    };
    check();
  }, [resolvedScenario?.id]);

  /**
   * Toggles the bookmark state for the currently resolved scenario.
   *
   * If there is no resolved scenario, this function returns early without making changes.
   * When the scenario is already bookmarked, it removes the bookmark and updates local state.
   * Otherwise, it adds a bookmark using the scenario's id/title and the route category (or an empty string)
   * and updates local state.
   *
   * @remarks
   * This function performs asynchronous persistence operations and then synchronizes the `bookmarked`
   * React state accordingly.
   *
   * @returns A promise that resolves when the add/remove operation completes and local state is updated.
   */
  const toggleBookmark = async () => {
    if (!resolvedScenario) return;
    if (bookmarked) {
      await removeBookmark(resolvedScenario.id);
      setBookmarked(false);
    } else {
      await addBookmark({
        id: resolvedScenario.id,
        title: resolvedScenario.title,
        category: resolvedScenario.category,
      });
      setBookmarked(true);
    }
  };

  if (!resolvedScenario) {
    return (
      <StackScreen title="Scenario not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No data available for this scenario.
        </Text>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={resolvedScenario.title}
      subtitle={resolvedScenario.category || undefined}
      trailing={
        <IconButton
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={COLORS.BRAND}
          accessibilityLabel={
            bookmarked ? 'Remove bookmark' : 'Bookmark this scenario'
          }
          onPress={toggleBookmark}
        />
      }
    >
      <View style={styles.column}>
        {!!resolvedScenario.situation && (
          <EntrySection title="Situation">
            <Text style={styles.body}>{resolvedScenario.situation}</Text>
          </EntrySection>
        )}

        {!!resolvedScenario.immediate_risks?.length && (
          <EntrySection title="Immediate risks" tone="warning">
            <EntryItemList items={resolvedScenario.immediate_risks} />
          </EntrySection>
        )}

        {!!resolvedScenario.first_5_minutes?.length && (
          <EntrySection title="First 5 minutes">
            <EntryItemList items={resolvedScenario.first_5_minutes} ordered />
          </EntrySection>
        )}

        {!!resolvedScenario.first_hour?.length && (
          <EntrySection title="First hour">
            <EntryItemList items={resolvedScenario.first_hour} ordered />
          </EntrySection>
        )}

        {!!resolvedScenario.first_day?.length && (
          <EntrySection title="First day">
            <EntryItemList items={resolvedScenario.first_day} ordered />
          </EntrySection>
        )}

        {!!resolvedScenario.watch_for?.length && (
          <EntrySection title="Watch for">
            <EntryItemList items={resolvedScenario.watch_for} />
          </EntrySection>
        )}

        {!!resolvedScenario.notes?.length && (
          <EntrySection title="Notes">
            <EntryItemList items={resolvedScenario.notes} />
          </EntrySection>
        )}
      </View>
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
});
