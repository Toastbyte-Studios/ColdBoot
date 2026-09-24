import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore, Note } from '../../stores';
import { TEXT_GUTTER } from '../../theme';
import NoteEditor, { NoteDraft } from './Shared/NoteEditor';

const isAndroid = Platform.OS === 'android';

type EditNoteScreenRouteProp = RouteProp<
  { EditNote: { note: Note } },
  'EditNote'
>;

type EditNoteScreenNavigationProp = NativeStackNavigationProp<
  { EditNote: { note: Note } },
  'EditNote'
>;

/**
 * Screen for editing an existing note.
 *
 * The composer is {@link NoteEditor}, shared with the New Note screen. The
 * note is looked up from the store by id rather than taken from the route
 * params, so the editor opens on the latest version of it; a note that is no
 * longer there gets the not-found state.
 *
 * @returns A React element rendering the "Edit Note" screen.
 */
export default observer(function EditNoteScreen() {
  const COLORS = useTheme();
  const core = useNotesStore();
  const navigation = useNavigation<EditNoteScreenNavigationProp>();
  const route = useRoute<EditNoteScreenRouteProp>();

  // Look up the note from the store by ID to ensure we have the latest version
  const note = core.notes.find((n) => n.id === route.params.note.id);

  if (!note) {
    return (
      <StackScreen title="Edit Note">
        <Text
          style={[
            styles.helperText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          Note not found. It may have been deleted.
        </Text>
      </StackScreen>
    );
  }

  const handleSubmit = async (draft: NoteDraft) => {
    await core.updateNoteContent(note.id, {
      title: draft.title,
      text: draft.text,
      category: draft.category,
      photoUris: draft.photoUris,
    });
    // Return to previous screen
    navigation.goBack();
  };

  return (
    <NoteEditor
      // Remount when a different note is opened, so the editor's local draft
      // starts from that note rather than the previous one's.
      key={note.id}
      screenTitle="Edit Note"
      categories={core.categories}
      initial={note}
      onSubmit={handleSubmit}
    />
  );
});

const styles = StyleSheet.create({
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
