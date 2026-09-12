import { RouteProp, useRoute } from '@react-navigation/native';
import React, { JSX, useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { HorizontalRule } from '../../components/HorizontalRule';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
} from '../../stores/BookmarksStore';
import { FOOTER_HEIGHT } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { ScenarioCardType } from '../../types/data-type';

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
 * - If the scenario is not found, a "Scenario Not Found" message is shown.
 * - The bookmark state is managed and persisted using async storage helpers.
 * - The scenario data is received via navigation route parameters.
 *
 * @returns {JSX.Element} The rendered ScenarioDetailScreen component.
 */
export default function ScenarioDetailScreen(): JSX.Element {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
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
      <ScreenBody>
        <SectionHeader>Scenario Not Found</SectionHeader>
        <View style={styles.missingWrap}>
          <Text style={styles.helperText}>
            No data available for this scenario.
          </Text>
        </View>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody>
      <SectionHeader>{resolvedScenario.title}</SectionHeader>
      <View style={styles.actions}>
        <IconButton
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={28}
          color={COLORS.PRIMARY_DARK}
          accessibilityLabel={
            bookmarked ? 'Remove bookmark' : 'Bookmark this scenario'
          }
          onPress={toggleBookmark}
        />
      </View>
      <View style={[styles.bodyWrap, { paddingBottom: footerClearance }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Situation */}
          {resolvedScenario.situation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Situation</Text>
              <Text style={styles.bodyText}>{resolvedScenario.situation}</Text>
            </View>
          )}

          {/* Immediate Risks */}
          {resolvedScenario.immediate_risks &&
            resolvedScenario.immediate_risks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Immediate Risks</Text>
                {resolvedScenario.immediate_risks.map((risk, idx) => (
                  <View key={idx} style={styles.bulletWrap}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{risk}</Text>
                  </View>
                ))}
              </View>
            )}

          <HorizontalRule />

          {/* First 5 Minutes */}
          {resolvedScenario.first_5_minutes &&
            resolvedScenario.first_5_minutes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>First 5 Minutes</Text>
                {resolvedScenario.first_5_minutes.map((action, idx) => (
                  <View key={idx} style={styles.bulletWrap}>
                    <Text style={styles.bullet}>{idx + 1}.</Text>
                    <Text style={styles.bulletText}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* First Hour */}
          {resolvedScenario.first_hour &&
            resolvedScenario.first_hour.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>First Hour</Text>
                {resolvedScenario.first_hour.map((action, idx) => (
                  <View key={idx} style={styles.bulletWrap}>
                    <Text style={styles.bullet}>{idx + 1}.</Text>
                    <Text style={styles.bulletText}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* First Day */}
          {resolvedScenario.first_day &&
            resolvedScenario.first_day.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>First Day</Text>
                {resolvedScenario.first_day.map((action, idx) => (
                  <View key={idx} style={styles.bulletWrap}>
                    <Text style={styles.bullet}>{idx + 1}.</Text>
                    <Text style={styles.bulletText}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

          <HorizontalRule />

          {/* Watch For.
              The ⚠ and ℹ markers below stay as text rather than becoming
              Ionicons: they belong to the same bullet-marker set as the "•"
              and the numbered steps above, all rendered through styles.bullet.
              Converting only two of the four would break the column. Same
              exception as the morse keypad — see docs/NATIVE_REDESIGN.md
              finding 7. */}
          {resolvedScenario.watch_for &&
            resolvedScenario.watch_for.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Watch For</Text>
                {resolvedScenario.watch_for.map((item, idx) => (
                  <View key={idx} style={styles.bulletWrap}>
                    <Text style={styles.bullet}>⚠</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* Notes */}
          {resolvedScenario.notes && resolvedScenario.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              {resolvedScenario.notes.map((note, idx) => (
                <View key={idx} style={styles.bulletWrap}>
                  <Text style={styles.bullet}>ℹ</Text>
                  <Text style={styles.bulletText}>{note}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenBody>
  );
}

// Body text was PRIMARY_LIGHT — near-white — which is unreadable on the pale
// light-scheme background. It now uses the theme foreground like the sibling
// ScenarioCards screens. See docs/NATIVE_REDESIGN.md finding 4.
const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      width: '100%',
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    bodyWrap: {
      flex: 1,
      width: '100%',
      paddingBottom: FOOTER_HEIGHT,
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: 12,
      paddingBottom: 32,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 10,
      color: COLORS.PRIMARY_DARK,
    },
    bodyText: {
      fontSize: 16,
      lineHeight: 24,
      color: COLORS.PRIMARY_DARK,
    },
    bulletWrap: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingLeft: 4,
    },
    bullet: {
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
      color: COLORS.PRIMARY_DARK,
      minWidth: 20,
    },
    bulletText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 24,
      color: COLORS.PRIMARY_DARK,
    },
    missingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    helperText: {
      fontSize: 16,
      opacity: 0.8,
      textAlign: 'center',
    },
  });
