import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { NoteSortSelector } from '../../components/NoteSortSelector';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore, useSettingsStore } from '../../stores';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { sortNotes } from '../../utils/noteSorting';
import { formatDateTime } from '../../utils/timeFormat';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

/**
 * Displays the 20 most recently created notes as rows in one grouped list.
 *
 * @remarks
 * - Notes are sourced from the notes store (`core.recentNotesTop20`) and
 *   ordered by the user's note sort preference.
 * - Each row shows the note's title, with its timestamp and category beneath.
 * - Tapping a row opens it in `NoteEntry`, which is where a note is read,
 *   bookmarked, edited and deleted. That replaces this screen's own
 *   expand-in-place body and per-row trash button, and matches the
 *   Bookmarked and Category note lists.
 *
 * @returns The Recent Notes screen content.
 */
export default observer(function RecentNotesScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const COLORS = useTheme();
  const core = useNotesStore();
  const settings = useSettingsStore();

  const sortedNotes = useMemo(
    () => sortNotes(core.recentNotesTop20, settings.noteSortOrder),
    [core.recentNotesTop20, settings.noteSortOrder],
  );

  return (
    <StackScreen
      title="Recent Notes"
      subtitle={`${sortedNotes.length} note${sortedNotes.length === 1 ? '' : 's'}`}
    >
      <View style={styles.sort}>
        <NoteSortSelector />
      </View>
      {sortedNotes.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No notes yet.
        </Text>
      ) : (
        <GroupContainer>
          {sortedNotes.map((note, index) => (
            <ModuleRow
              key={note.id}
              title={note.title || '(Untitled)'}
              icon="document-text-outline"
              subtitle={`${formatDateTime(new Date(note.createdAt))} · ${note.category}`}
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
