import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import SelectMenu from '../../components/SelectMenu';
import SketchCanvas, {
  SketchCanvasHandle,
} from '../../components/SketchCanvas';
import Touchable from '../../components/Touchable';
import { useKeyboardStatus } from '../../hooks/useKeyboardStatus';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore, Note } from '../../stores';
import { FOOTER_HEIGHT } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { withAlpha } from '../../theme/colorUtils';
import { pickPhoto } from '../../utils/photoPicker';
import { MAX_TITLE_LENGTH } from './constants';

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
 * Provides UI to:
 * - Edit the note title
 * - Edit the note text content
 * - Change the note category
 * - Save changes or cancel
 *
 * Keyboard handling:
 * - Wraps content in `KeyboardAvoidingView` (iOS uses `padding`) and dismisses the keyboard
 *   when tapping outside inputs.
 * - Adapts input height based on `useKeyboardStatus().isVisible`.
 *
 * Validation:
 * - Save action is disabled until the trimmed text is non-empty.
 *
 * @returns A React element rendering the "Edit Note" screen.
 */
export default observer(function EditNoteScreen() {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const core = useNotesStore();
  const navigation = useNavigation<EditNoteScreenNavigationProp>();
  const route = useRoute<EditNoteScreenRouteProp>();
  const sketchCanvasRef = useRef<SketchCanvasHandle>(null);
  const sketchSaveResolveRef = useRef<((dataUri: string) => void) | null>(null);
  const noteId = route.params.note.id;

  // Look up the note from the store by ID to ensure we have the latest version
  const note = core.notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(note?.title || '');
  const [text, setText] = useState(note?.text || '');
  const [sketchDataUri, setSketchDataUri] = useState<string | undefined>(
    note?.sketchDataUri,
  );
  const [hasDrawn, setHasDrawn] = useState(!!note?.sketchDataUri);
  const [category, setCategory] = useState(
    note?.category || core.categories[0] || 'General',
  );
  const [photoUris, setPhotoUris] = useState<string[]>(note?.photoUris || []);
  const { isKeyboardVisible } = useKeyboardStatus();
  const noteType = note?.type || 'text';
  const hasContent: boolean =
    noteType === 'text'
      ? text.trim().length > 0
      : hasDrawn && title.trim().length > 0;
  const animatedHeight = useMemo(() => new Animated.Value(250), []);
  const disabledIcon = withAlpha(COLORS.PRIMARY_DARK, 0.3);

  // Update local state when the note changes in the store
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setText(note.text || '');
      setSketchDataUri(note.sketchDataUri);
      setHasDrawn(!!note.sketchDataUri);
      setCategory(note.category || core.categories[0] || 'General');
      setPhotoUris(note.photoUris || []);
    } else {
      // Reset form if note is no longer available (e.g., deleted)
      setTitle('');
      setText('');
      setSketchDataUri(undefined);
      setHasDrawn(false);
      setCategory(core.categories[0] || 'General');
      setPhotoUris([]);
    }
  }, [note, core.categories]);

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isKeyboardVisible ? 100 : 250,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isKeyboardVisible, animatedHeight]);

  // Disable gesture navigation when in sketch mode
  useEffect(() => {
    if (navigation && 'setOptions' in navigation) {
      navigation.setOptions({
        gestureEnabled: noteType !== 'sketch',
      });
    }
  }, [noteType, navigation]);

  if (!note) {
    return (
      <ScreenBody>
        <SectionHeader>Edit Note</SectionHeader>
        <View style={styles.card}>
          <Text style={styles.value}>
            Note not found. It may have been deleted.
          </Text>
        </View>
      </ScreenBody>
    );
  }

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

      const updateParams: {
        title: string;
        text?: string;
        sketchDataUri?: string;
        category: string;
        photoUris?: string[];
      } = {
        title,
        category,
        photoUris,
      };

      if (noteType === 'text') {
        updateParams.text = text;
      } else {
        updateParams.sketchDataUri = sketchData;
      }

      await core.updateNoteContent(note.id, updateParams);
      // Return to previous screen
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
      console.error('Failed to update note:', error);
    }
  };

  const cancelButton = (
    <IconButton
      name="close-outline"
      size={30}
      onPress={() => {
        navigation.goBack();
      }}
      accessibilityLabel="Cancel"
    />
  );

  return (
    <ScreenBody>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Not a button: a tap-anywhere surface that dismisses the keyboard,
            hidden from accessibility. */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.innerContainer}>
            <SectionHeader>Edit Note</SectionHeader>
            <View style={styles.card}>
              <View style={styles.inlineCenter}>
                <SelectMenu
                  title="Category"
                  options={core.categories.map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                  value={category}
                  onSelect={setCategory}
                  accessibilityLabel={`Category: ${category}`}
                  style={styles.dropdown}
                >
                  <View style={styles.dropdownHeader}>
                    <Text style={styles.dropdownHeaderText} numberOfLines={1}>
                      {category}
                    </Text>
                    <Icon
                      name="chevron-down-outline"
                      size={18}
                      color={COLORS.PRIMARY_DARK}
                    />
                  </View>
                </SelectMenu>

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
                  accessibilityHint="Choose from camera or photo library to attach a photo to your note"
                />
              </View>

              <View style={styles.inline}>
                <IconButton
                  name="checkmark-outline"
                  size={30}
                  disabled={!hasContent}
                  disabledColor={disabledIcon}
                  onPress={handleSave}
                  accessibilityLabel="Save note"
                />
                <View style={styles.spacer} />
                {noteType === 'sketch' ? (
                  <View style={styles.sketchControls}>
                    <IconButton
                      name="arrow-undo-outline"
                      size={30}
                      onPress={() => {
                        sketchCanvasRef.current?.undo();
                      }}
                      accessibilityLabel="Undo last stroke"
                    />
                    <IconButton
                      name="trash-outline"
                      size={30}
                      onPress={() => {
                        sketchCanvasRef.current?.clearSignature();
                        setSketchDataUri(undefined);
                        setHasDrawn(false);
                      }}
                      accessibilityLabel="Clear sketch"
                    />
                    {cancelButton}
                  </View>
                ) : (
                  <View style={styles.sketchControls}>
                    <IconButton
                      name="trash-outline"
                      size={30}
                      disabled={!hasContent}
                      disabledColor={disabledIcon}
                      onPress={() => {
                        setText('');
                      }}
                      accessibilityLabel="Clear note"
                    />
                    {cancelButton}
                  </View>
                )}
              </View>

              <TextInput
                style={styles.titleInput}
                placeholder={
                  noteType === 'sketch'
                    ? 'Title (required)'
                    : 'Title (optional)'
                }
                placeholderTextColor={COLORS.MUTED}
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TITLE_LENGTH}
              />

              {photoUris.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={styles.label}>Attached Photos</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                  >
                    {photoUris.map((uri, index) => (
                      <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {/* Kept at 24pt and extended with hitSlop: it sits on
                            the thumbnail's corner, and a 44pt circle would
                            cover most of an 80pt photo. Finding 8, route 3. */}
                        <Touchable
                          style={styles.removePhotoButton}
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

              <Text style={styles.label}>
                {noteType === 'text' ? 'Text' : 'Sketch'}
              </Text>
              {noteType === 'text' ? (
                <Animated.View
                  style={[
                    styles.animatedInputContainer,
                    { height: animatedHeight },
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your note..."
                    placeholderTextColor={COLORS.MUTED}
                    multiline
                    value={text}
                    onChangeText={setText}
                  />
                </Animated.View>
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenBody>
  );
});

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
    },
    innerContainer: {
      flex: 1,
      width: '100%',
    },
    card: {
      flex: 1 - FOOTER_HEIGHT,
      width: '100%',
      backgroundColor: COLORS.BRAND,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: COLORS.SECONDARY_ACCENT,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginTop: 6,
      marginBottom: FOOTER_HEIGHT + 6,
    },
    label: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.9,
      marginBottom: 6,
      fontWeight: '700',
    },
    value: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
    },
    titleInput: {
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderColor: COLORS.SECONDARY_ACCENT,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      marginBottom: 12,
      color: COLORS.PRIMARY_DARK,
      fontSize: 14,
    },
    inline: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    spacer: {
      flex: 1,
    },
    sketchControls: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    inlineCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    animatedInputContainer: {
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderColor: COLORS.SECONDARY_ACCENT,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      marginBottom: 12,
      overflow: 'hidden',
    },
    textInput: {
      flex: 1,
      color: COLORS.PRIMARY_DARK,
    },
    sketchContainer: {
      height: 250,
      marginBottom: 12,
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
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderColor: COLORS.SECONDARY_ACCENT,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
    },
    dropdownHeaderText: {
      flexShrink: 1,
      color: COLORS.PRIMARY_DARK,
      fontSize: 14,
      fontWeight: '600',
    },
    photosContainer: {
      marginBottom: 12,
    },
    photosScroll: {
      maxHeight: 100,
    },
    photoWrapper: {
      marginRight: 8,
      position: 'relative',
    },
    photoThumb: {
      width: 80,
      height: 80,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.SECONDARY_ACCENT,
    },
    removePhotoButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderRadius: 12,
    },
  });
