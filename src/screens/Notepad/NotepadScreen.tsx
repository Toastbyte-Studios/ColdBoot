import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardTopic from '../../components/CardTopic';
import Grid from '../../components/Grid';
import { HorizontalRule } from '../../components/HorizontalRule';
import IconButton from '../../components/IconButton';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useNotesStore } from '../../stores';

/**
 * Notepad landing screen.
 *
 * @remarks
 * Presents a dashboard of note-related actions and routes:
 * - **New Note** → navigates to the `NewNote` screen
 * - **Recent Notes** → navigates to the `RecentNotes` screen
 * - **Saved Notes** → navigates to the `SavedNotes` screen
 * - **Note Categories** → mapped as CardTopic cards that navigate to category-specific screens
 *
 * Uses React Navigation to perform screen transitions from card taps.
 *
 * @returns A screen layout containing a header, action buttons, and a grid of navigation cards.
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
    <ScreenBody>
      <SectionHeader>Notepad</SectionHeader>
      <View style={styles.noteHeader}>
        <IconButton
          name="create-outline"
          size={30}
          accessibilityLabel="New Note"
          onPress={() => navigation.navigate('NewNote')}
        />
        <IconButton
          name="time-outline"
          size={30}
          accessibilityLabel="Recent Notes"
          onPress={() => navigation.navigate('RecentNotes')}
        />
        <IconButton
          name="bookmark-outline"
          size={30}
          accessibilityLabel="Bookmarked Notes"
          onPress={() => navigation.navigate('BookmarkedNotes')}
        />
        <IconButton
          name="folder-open-outline"
          size={30}
          accessibilityLabel="Manage Categories"
          onPress={() => navigation.navigate('ManageCategories')}
        />
      </View>
      <HorizontalRule />

      <Grid>
        {core.categories.map((cat) => (
          <CardTopic
            key={cat}
            title={cat}
            icon={categoryIcons[cat] || 'folder-outline'}
            onPress={() =>
              navigation.navigate('NoteCategory', { category: cat })
            }
          />
        ))}
      </Grid>
    </ScreenBody>
  );
});

const styles = StyleSheet.create({
  noteHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
});
