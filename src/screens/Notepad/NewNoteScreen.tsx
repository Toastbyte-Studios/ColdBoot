import { useNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useNotesStore } from '../../stores';
import NoteEditor, { NoteDraft } from './Shared/NoteEditor';

type NewNoteScreenNavigationProp = NativeStackNavigationProp<ParamListBase>;

/**
 * Screen for composing and saving a new note.
 *
 * The composer itself is {@link NoteEditor}, shared with the Edit screen: a
 * category selector, a title, optional photos and a body. This screen
 * supplies the empty draft and writes the result to the store.
 *
 * @returns A React element rendering the "New Note" creation screen.
 */
export default observer(function NewNoteScreen() {
  const core = useNotesStore();
  const navigation = useNavigation<NewNoteScreenNavigationProp>();

  const handleSubmit = async (draft: NoteDraft) => {
    await core.createNote({ ...draft, type: 'text' });
    // Return to previous screen (Notepad)
    navigation.goBack();
  };

  return (
    <NoteEditor
      screenTitle="New Note"
      categories={core.categories}
      onSubmit={handleSubmit}
    />
  );
});
