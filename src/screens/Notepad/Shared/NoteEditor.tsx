import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
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

export type NoteDraft = {
  title: string;
  text: string;
  category: string;
  photoUris: string[];
};

type Props = {
  /** The screen's large title — "New Note", "Edit Note". */
  screenTitle: string;
  categories: string[];
  /** The note being edited, if any. Absent means a new note. */
  initial?: {
    title?: string;
    text?: string;
    category?: string;
    photoUris?: string[];
  };
  /** Receives the draft when the user commits it. */
  onSubmit: (draft: NoteDraft) => Promise<void>;
};

/**
 * The note composer, shared by the New and Edit note screens.
 *
 * Both screens are the same editor over the same fields — category, title,
 * photos and body — differing only in where the initial values come from and
 * what saving does.
 *
 * It owns the whole screen, `StackScreen` included, because the save and
 * clear actions live in the title row's trailing slot, where every other
 * migrated screen keeps its actions.
 */
export default observer(function NoteEditor({
  screenTitle,
  categories,
  initial,
  onSubmit,
}: Props) {
  const COLORS = useTheme();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [category, setCategory] = useState(
    initial?.category ?? categories[0] ?? 'General',
  );
  const [photoUris, setPhotoUris] = useState<string[]>(
    initial?.photoUris ?? [],
  );

  const hasContent = text.trim().length > 0;
  const disabledIcon = withAlpha(COLORS.PRIMARY_DARK, 0.3);

  const handleSave = async () => {
    try {
      await onSubmit({ title, text, category, photoUris });
    } catch (error) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
      console.error('Failed to save note:', error);
    }
  };

  return (
    <StackScreen
      title={screenTitle}
      subtitle={category}
      keyboardShouldPersistTaps="handled"
      trailing={
        <>
          <IconButton
            name="trash-outline"
            size={22}
            disabled={!hasContent}
            disabledColor={disabledIcon}
            onPress={() => setText('')}
            accessibilityLabel="Clear note"
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
          placeholder="Title (optional)"
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
