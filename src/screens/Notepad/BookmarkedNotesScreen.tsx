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

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

/**
 * Displays all bookmarked notes.
 *
 * This screen displays all notes that have been bookmarked by the user
 * as rows in one grouped list. If no bookmarked notes exist,
 * a helper message is shown.
 *
 * @returns {JSX.Element} The rendered bookmarked notes screen component.
 *
 * @remarks
 * - Reads bookmarked notes from the CoreStore.
 * - Similar UI/UX pattern to the NoteCategoryScreen.
 * - Notes are sorted by creation date (most recent first).
 */
export default observer(function BookmarkedNotesScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useNotesStore();
  const settings = useSettingsStore();
  const COLORS = useTheme();

  const bookmarkedNotes = useMemo(
    () => core.bookmarkedNotes,
    [core.bookmarkedNotes],
  );

  const sortedNotes = useMemo(
    () => sortNotes(bookmarkedNotes, settings.noteSortOrder),
    [bookmarkedNotes, settings.noteSortOrder],
  );

  return (
    <StackScreen
      title="Bookmarked Notes"
      subtitle={`${sortedNotes.length} note${sortedNotes.length === 1 ? '' : 's'}`}
    >
      <View style={styles.sort}>
        <NoteSortSelector />
      </View>
      {sortedNotes.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No bookmarked notes yet.
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
