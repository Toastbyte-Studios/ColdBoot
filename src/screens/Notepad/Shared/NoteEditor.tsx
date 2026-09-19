import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import IconButton from '../../../components/IconButton';
import { Text } from '../../../components/ScaledText';
import SectionEyebrow from '../../../components/SectionEyebrow';
import SelectMenu from '../../../components/SelectMenu';
import SketchCanvas, {
  SketchCanvasHandle,
} from '../../../components/SketchCanvas';
import StackScreen from '../../../components/StackScreen';
import Touchable from '../../../components/Touchable';
import { useTheme } from '../../../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../../../theme';
import { cardSurface } from '../../../theme/cardSurface';
import { withAlpha } from '../../../theme/colorUtils';
import { pickPhoto } from '../../../utils/photoPicker';
import { MAX_TITLE_LENGTH } from '../constants';

const isAndroid = Platform.OS === 'android';

/** The text area's height. Was a keyboard-driven Animated height, which a
 *  scrolling screen no longer needs: the scroll view moves the field into
 *  view instead of the field shrinking to make room. */
const TEXT_AREA_HEIGHT = 260;

export type NoteType = 'text' | 'sketch';

const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'sketch', label: 'Sketch' },
];

export type NoteDraft = {
  type: NoteType;
  title: string;
  text?: string;
  sketchDataUri?: string;
  category: string;
  photoUris: string[];
};

type Props = {
  /** The screen's large title — "New Note", "Edit Note". */
  screenTitle: string;
  categories: string[];
  /** The note being edited, if any. Absent means a new note. */
  initial?: {
    type?: NoteType;
    title?: string;
    text?: string;
    sketchDataUri?: string;
    category?: string;
    photoUris?: string[];
  };
  /**
   * Whether the note's type can still be chosen. A new note picks text or
   * sketch; an existing one is already one or the other.
   */
  allowTypeChange?: boolean;
  /** Receives the draft when the user commits it. */
  onSubmit: (draft: NoteDraft) => Promise<void>;
};

/**
 * The note composer, shared by the New and Edit note screens.
 *
 * Both screens are the same editor over the same fields — category, type,
 * title, photos, and either a body or a sketch — differing only in where the
 * initial values come from and what saving does. They were two near-identical
 * 500-line files; this is the one of them.
 *
 * It owns the whole screen, `StackScreen` included, because the save and
 * clear actions live in the title row's trailing slot, where every other
 * migrated screen keeps its actions.
 */
export default observer(function NoteEditor({
  screenTitle,
  categories,
  initial,
  allowTypeChange = false,
  onSubmit,
}: Props) {
  const COLORS = useTheme();
  const navigation = useNavigation();
  const sketchCanvasRef = useRef<SketchCanvasHandle>(null);
  const sketchSaveResolveRef = useRef<((dataUri: string) => void) | null>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [sketchDataUri, setSketchDataUri] = useState<string | undefined>(
    initial?.sketchDataUri,
  );
  const [hasDrawn, setHasDrawn] = useState(!!initial?.sketchDataUri);
  const [category, setCategory] = useState(
    initial?.category ?? categories[0] ?? 'General',
  );
  const [noteType, setNoteType] = useState<NoteType>(initial?.type ?? 'text');
  const [photoUris, setPhotoUris] = useState<string[]>(
    initial?.photoUris ?? [],
  );

  const hasContent: boolean =
    noteType === 'text'
      ? text.trim().length > 0
      : hasDrawn && title.trim().length > 0;
  const disabledIcon = withAlpha(COLORS.PRIMARY_DARK, 0.3);

  // Disable gesture navigation when in sketch mode, so a stroke that starts
  // near the screen edge draws rather than popping the screen.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: noteType !== 'sketch' });
  }, [noteType, navigation]);

  const handleSave = async () => {
    try {
      let sketchData = sketchDataUri;

      // For sketch notes, read the signature first and wait for the callback
      if (noteType === 'sketch') {
        sketchData = await new Promise<string>((resolve) => {
          sketchSaveResolveRef.current = resolve;
          sketchCanvasRef.current?.readSignature();

          // Fallback timeout in case callback doesn't fire
          setTimeout(() => {
            if (sketchSaveResolveRef.current) {
              sketchSaveResolveRef.current(sketchDataUri || '');
              sketchSaveResolveRef.current = null;
            }
          }, 1000);
        });
      }

      await onSubmit({
        type: noteType,
        title,
        category,
        photoUris,
        ...(noteType === 'text'
          ? { text }
          : { sketchDataUri: sketchData ?? undefined }),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
      console.error('Failed to save note:', error);
    }
  };

  const clearSketch = () => {
    sketchCanvasRef.current?.clearSignature();
    setSketchDataUri(undefined);
    setHasDrawn(false);
  };

  return (
    <StackScreen
      title={screenTitle}
      subtitle={category}
      keyboardShouldPersistTaps="handled"
      trailing={
        <>
          {noteType === 'sketch' ? (
            <IconButton
              name="arrow-undo-outline"
              size={22}
              onPress={() => sketchCanvasRef.current?.undo()}
              accessibilityLabel="Undo last stroke"
            />
          ) : null}
          <IconButton
            name="trash-outline"
            size={22}
            disabled={noteType === 'text' && !hasContent}
            disabledColor={disabledIcon}
            onPress={() =>
              noteType === 'sketch' ? clearSketch() : setText('')
            }
            accessibilityLabel={
              noteType === 'sketch' ? 'Clear sketch' : 'Clear note'
            }
          />
          <IconButton
            name="checkmark-outline"
            size={22}
            disabled={!hasContent}
            disabledColor={disabledIcon}
            onPress={handleSave}
            accessibilityLabel="Save note"
          />
        </>
      }
    >
      <View style={[styles.card, cardSurface(COLORS)]}>
        <View style={styles.selectors}>
          <SelectMenu
            title="Category"
            options={categories.map((cat) => ({ value: cat, label: cat }))}
            value={category}
            onSelect={setCategory}
            accessibilityLabel={`Category: ${category}`}
            style={styles.dropdown}
          >
            <View
              style={[
                styles.dropdownHeader,
                {
                  backgroundColor: COLORS.SURFACE_CONTAINER,
                  borderColor: COLORS.BORDER,
                },
              ]}
            >
              <Text style={styles.dropdownHeaderText} numberOfLines={1}>
                {category}
              </Text>
              <Icon
                name="chevron-down-outline"
                size={18}
                color={COLORS.MUTED}
              />
            </View>
          </SelectMenu>

          {allowTypeChange ? (
            <SelectMenu
              title="Note type"
              options={NOTE_TYPE_OPTIONS}
              value={noteType}
              onSelect={setNoteType}
              accessibilityLabel={`Note type: ${
                noteType === 'text' ? 'Text' : 'Sketch'
              }`}
              style={styles.dropdown}
            >
              <View
                style={[
                  styles.dropdownHeader,
                  {
                    backgroundColor: COLORS.SURFACE_CONTAINER,
                    borderColor: COLORS.BORDER,
                  },
                ]}
              >
                <Text style={styles.dropdownHeaderText}>
                  {noteType === 'text' ? 'Text' : 'Sketch'}
                </Text>
                <Icon
                  name="chevron-down-outline"
                  size={18}
                  color={COLORS.MUTED}
                />
              </View>
            </SelectMenu>
          ) : null}

          <IconButton
            name="camera-outline"
            size={22}
            onPress={async () => {
              const uri = await pickPhoto();
              if (uri) {
                setPhotoUris((prev) => [...prev, uri]);
              }
            }}
            accessibilityLabel="Attach photo"
            accessibilityHint="Opens camera to attach a photo to your note"
          />
        </View>

        <TextInput
          style={[
            styles.titleInput,
            {
              backgroundColor: COLORS.SURFACE_CONTAINER,
              borderColor: COLORS.BORDER,
              color: COLORS.PRIMARY_DARK,
            },
          ]}
          placeholder={
            noteType === 'sketch' ? 'Title (required)' : 'Title (optional)'
          }
          placeholderTextColor={COLORS.MUTED}
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE_LENGTH}
          accessibilityLabel="Note title"
        />

        {photoUris.length > 0 && (
          <View style={styles.photos}>
            <SectionEyebrow inline>Attached photos</SectionEyebrow>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
            >
              {photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                  <Image
                    source={{ uri }}
                    style={[styles.photoThumb, { borderColor: COLORS.BORDER }]}
                  />
                  {/* Kept at 24pt and extended with hitSlop: it sits on
                      the thumbnail's corner, and a 44pt circle would
                      cover most of an 80pt photo. Finding 8, route 3. */}
                  <Touchable
                    style={[
                      styles.removePhotoButton,
                      { backgroundColor: COLORS.SURFACE },
                    ]}
                    borderless
                    hitSlop={10}
                    onPress={() => {
                      setPhotoUris((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    accessibilityRole="button"
                  >
                    <Icon
                      name="close-circle-outline"
                      size={24}
                      color={COLORS.PRIMARY_DARK}
                    />
                  </Touchable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <SectionEyebrow inline>
          {noteType === 'text' ? 'Text' : 'Sketch'}
        </SectionEyebrow>
        {noteType === 'text' ? (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: COLORS.SURFACE_CONTAINER,
                borderColor: COLORS.BORDER,
                color: COLORS.PRIMARY_DARK,
              },
            ]}
            placeholder="Type your note..."
            placeholderTextColor={COLORS.MUTED}
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
            accessibilityLabel="Note text"
          />
        ) : (
          <View style={styles.sketchContainer}>
            <SketchCanvas
              ref={sketchCanvasRef}
              onSketchSave={(dataUri: string) => {
                setSketchDataUri(dataUri);
                // If we're waiting for sketch data for save, resolve the promise
                if (sketchSaveResolveRef.current) {
                  sketchSaveResolveRef.current(dataUri);
                  sketchSaveResolveRef.current = null;
                }
              }}
              initialSketch={sketchDataUri}
              onClear={() => {
                setSketchDataUri(undefined);
                setHasDrawn(false);
              }}
              onBegin={() => setHasDrawn(true)}
            />
          </View>
        )}
      </View>
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  // StackScreen's Android content is full-bleed; the card carries the gutter.
  card: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  selectors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dropdown: {
    flex: 1,
  },
  // The menu trigger. A plain View, not a Touchable: SelectMenu owns the tap.
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: RADIUS.tileSmall,
    paddingHorizontal: SPACING.sm,
  },
  dropdownHeaderText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: RADIUS.tileSmall,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    fontSize: 14,
  },
  textInput: {
    height: TEXT_AREA_HEIGHT,
    borderWidth: 1,
    borderRadius: RADIUS.tileSmall,
    padding: SPACING.sm,
    fontSize: 15,
  },
  sketchContainer: {
    height: 250,
  },
  photos: {
    marginBottom: SPACING.md,
  },
  photosScroll: {
    maxHeight: 100,
  },
  photoWrapper: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.tileSmall,
    borderWidth: 1,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
});
