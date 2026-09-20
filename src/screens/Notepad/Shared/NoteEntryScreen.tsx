import {
  NavigationProp,
  ParamListBase,
  useRoute,
  useNavigation,
  RouteProp,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Platform, StyleSheet, View, Alert, Image } from 'react-native';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import StackScreen from '../../../components/StackScreen';
import { useTheme } from '../../../hooks/useTheme';
import { useNotesStore } from '../../../stores';
import { Note } from '../../../stores/NotesStore';
import { RADIUS, SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../../theme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme } from '../../../theme/colors';
import { PAPER } from '../../../theme/fixedSurfaces';
import { formatDateTime } from '../../../utils/timeFormat';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type NoteEntryRouteProp = RouteProp<{ NoteEntry: { note: Note } }, 'NoteEntry'>;

/**
 * Displays a single note in fully expanded state.
 *
 * This screen retrieves a note from the navigation route parameters and displays
 * it with its full title and body text. Edit, bookmark and delete live in the
 * title row's trailing slot, where the other stack screens keep their actions.
 *
 * @returns {JSX.Element} The rendered note entry screen component.
 *
 * @remarks
 * - Receives `note` parameter from the route params
 * - Displays the note title as the screen title, its timestamp and category
 *   as the subtitle
 * - Shows the full note text, or the sketch, on a card
 * - Voice logs should be accessed through the Voice Log feature instead
 */
export default observer(function NoteEntryScreen(): React.JSX.Element {
  const COLORS = useTheme();
  const route = useRoute<NoteEntryRouteProp>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useNotesStore();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(
    route.params?.note?.bookmarked ?? false,
  );

  const { note } = route.params || {};

  if (!note) {
    return (
      <StackScreen title="Note not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          The requested note could not be found.
        </Text>
      </StackScreen>
    );
  }

  const noteTitle = note.title || '(Untitled)';
  const noteText = note.text || '';
  const noteType = note.type || 'text';
  const sketchDataUri = note.sketchDataUri;

  const handleBookmarkPress = async () => {
    await core.toggleNoteBookmark(note.id);
    setIsBookmarked(!isBookmarked);
  };

  const handleDeletePress = () => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await core.deleteNote(note.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <StackScreen
      title={noteTitle}
      subtitle={`${formatDateTime(new Date(note.createdAt))} · ${note.category}`}
      trailing={
        <>
          <IconButton
            name="create-outline"
            size={22}
            accessibilityLabel="Edit note"
            onPress={() => navigation.navigate('EditNote', { note })}
          />
          <IconButton
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            accessibilityLabel={
              isBookmarked ? 'Remove bookmark' : 'Bookmark note'
            }
            onPress={handleBookmarkPress}
          />
          <IconButton
            name="trash-outline"
            size={22}
            color={COLORS.ERROR}
            accessibilityLabel="Delete note"
            onPress={handleDeletePress}
          />
        </>
      }
    >
      {noteType === 'sketch' ? (
        sketchDataUri ? (
          /* Sketches are saved as PNGs drawn dark-on-light by SketchCanvas, so
             their backdrop stays PAPER-coloured in both schemes rather than
             following the theme. See src/theme/fixedSurfaces.ts. */
          <View style={styles.sketchPlate}>
            <Image
              source={{ uri: sketchDataUri }}
              style={styles.sketchImage}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.card, cardSurface(COLORS)]}>
            <Text style={styles.body}>No sketch data available.</Text>
          </View>
        )
      ) : (
        <View style={[styles.card, cardSurface(COLORS)]}>
          <Text style={styles.body}>{noteText}</Text>
        </View>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  // StackScreen's Android content is full-bleed; cards carry the gutter.
  card: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  sketchPlate: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    minHeight: 200,
    backgroundColor: PAPER,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sketchImage: {
    width: '100%',
    height: 300,
  },
});
