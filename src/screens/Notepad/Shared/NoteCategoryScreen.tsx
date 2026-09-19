import {
  NavigationProp,
  ParamListBase,
  useRoute,
  useNavigation,
  RouteProp,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import GroupContainer from '../../../components/GroupContainer';
import ModuleRow from '../../../components/ModuleRow';
import { NoteSortSelector } from '../../../components/NoteSortSelector';
import { Text } from '../../../components/ScaledText';
import StackScreen from '../../../components/StackScreen';
import { useTheme } from '../../../hooks/useTheme';
import { useNotesStore, useSettingsStore } from '../../../stores';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../../theme';
import { ColorScheme } from '../../../theme/colors';
import { sortNotes } from '../../../utils/noteSorting';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type NoteCategoryRouteProp = RouteProp<
  { NoteCategory: { category: string } },
  'NoteCategory'
>;

/**
 * Displays all notes for a specific category.
 *
 * This screen retrieves the category name from the navigation route parameters
 * and displays all notes belonging to that category as rows in one grouped list.
 * If no notes are found for the category, a helper message is shown.
 *
 * @returns {JSX.Element} The rendered note category screen component.
 *
 * @remarks
 * - Reads notes from the CoreStore grouped by category.
 * - Navigates back to NotepadScreen when category has no notes.
 * - Similar UI/UX pattern to the Reference module's CategoryScreen.
 */
export default observer(function NoteCategoryScreen(): React.JSX.Element {
  const route = useRoute<NoteCategoryRouteProp>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useNotesStore();
  const settings = useSettingsStore();
  const COLORS = useTheme();

  const { category } = route.params || {};
  // Filter out Voice Logs from NotePad screens
  const isValidCategory =
    category && category !== 'Voice Logs' && core.categories.includes(category);
  const notes = useMemo(
    () => (isValidCategory ? (core.notesByCategory[category] ?? []) : []),
    [isValidCategory, category, core.notesByCategory],
  );

  const sortedNotes = useMemo(
    () => sortNotes(notes, settings.noteSortOrder),
    [notes, settings.noteSortOrder],
  );

  return (
    <StackScreen
      title={category}
      subtitle={`${sortedNotes.length} note${sortedNotes.length === 1 ? '' : 's'}`}
    >
      <View style={styles.sort}>
        <NoteSortSelector />
      </View>
      {sortedNotes.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No notes in this category yet.
        </Text>
      ) : (
        <GroupContainer>
          {sortedNotes.map((note, index) => (
            <ModuleRow
              key={note.id}
              title={note.title || '(Untitled)'}
              icon="document-text-outline"
              variant="tool"
              showSeparator={index < sortedNotes.length - 1}
              onPress={() => navigation.navigate('NoteEntry', { note })}
            />
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  sort: {
    // StackScreen's Android content is full-bleed; controls carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
