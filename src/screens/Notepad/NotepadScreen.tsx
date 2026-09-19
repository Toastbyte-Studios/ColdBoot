import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useNotesStore } from '../../stores';

/**
 * Notepad landing screen.
 *
 * @remarks
 * Presents a dashboard of note-related actions and routes:
 * - **New Note** → navigates to the `NewNote` screen
 * - **Recent Notes** → navigates to the `RecentNotes` screen
 * - **Saved Notes** → navigates to the `SavedNotes` screen
 * - **Note Categories** → listed as rows in one grouped list that navigate to category-specific screens
 *
 * Uses React Navigation to perform screen transitions from row taps.
 *
 * @returns A screen layout containing a title row with action buttons and a grouped list of navigation rows.
 */
export default observer(function NotepadScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useNotesStore();

  const categoryIcons: Record<string, string> = {
    General: 'folder-outline',
    Work: 'briefcase-outline',
    Personal: 'heart-outline',
    Ideas: 'bulb-outline',
  };
  return (
    <StackScreen
      title="Notepad"
      subtitle={`${core.categories.length} categor${core.categories.length === 1 ? 'y' : 'ies'}`}
      trailing={
        <>
          <IconButton
            name="create-outline"
            size={22}
            accessibilityLabel="New Note"
            onPress={() => navigation.navigate('NewNote')}
          />
          <IconButton
            name="time-outline"
            size={22}
            accessibilityLabel="Recent Notes"
            onPress={() => navigation.navigate('RecentNotes')}
          />
          <IconButton
            name="bookmark-outline"
            size={22}
            accessibilityLabel="Bookmarked Notes"
            onPress={() => navigation.navigate('BookmarkedNotes')}
          />
          <IconButton
            name="folder-open-outline"
            size={22}
            accessibilityLabel="Manage Categories"
            onPress={() => navigation.navigate('ManageCategories')}
          />
        </>
      }
    >
      <GroupContainer>
        {core.categories.map((cat, index, all) => (
          <ModuleRow
            key={cat}
            title={cat}
            icon={categoryIcons[cat] || 'folder-outline'}
            variant="tool"
            showSeparator={index < all.length - 1}
            onPress={() =>
              navigation.navigate('NoteCategory', { category: cat })
            }
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
