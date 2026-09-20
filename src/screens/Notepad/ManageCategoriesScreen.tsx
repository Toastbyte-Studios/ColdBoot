import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import CategoryManagerRow from '../../components/CategoryManagerRow';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore } from '../../stores';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { FormInput } from '../Shared/Prepper';

const isAndroid = Platform.OS === 'android';

/**
 * Screen for managing note categories.
 *
 * Allows users to:
 * - View all categories
 * - Add new categories
 * - Delete existing categories (with warnings)
 *
 * @returns {React.JSX.Element} The rendered manage categories screen component.
 */
export default observer(function ManageCategoriesScreen(): React.JSX.Element {
  const COLORS = useTheme();
  const core = useNotesStore();
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleToggleAddCategory = () => {
    setIsAdding((current) => {
      if (current) {
        setNewCategoryName('');
      }
      return !current;
    });
  };

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }
    if (trimmedName === 'Voice Logs') {
      Alert.alert('Error', 'Voice Logs is a reserved category name');
      return;
    }
    try {
      await core.addCategory(trimmedName);
      setNewCategoryName('');
      setIsAdding(false);
      Alert.alert('Success', `Category "${trimmedName}" added successfully`);
    } catch (error) {
      Alert.alert(
        'Error',
        (error as Error).message || 'Failed to add category',
      );
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
    const noteCount = core.getCategoryNoteCount(categoryName);

    if (noteCount === 0) {
      // No notes in category - single warning
      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete the category "${categoryName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await core.deleteCategory(categoryName);
              } catch (error) {
                Alert.alert(
                  'Error',
                  (error as Error).message || 'Failed to delete category',
                );
              }
            },
          },
        ],
      );
    } else {
      // Category has notes - first warning
      Alert.alert(
        'Delete Category',
        `This category contains ${noteCount} note${noteCount > 1 ? 's' : ''}. Are you sure you want to delete it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // Second warning with reassignment confirmation
              const fallbackCategory = core.categories.find(
                (c) => c !== categoryName,
              );
              if (!fallbackCategory) {
                Alert.alert('Error', 'No fallback category available');
                return;
              }
              // Capture note count before async operation to ensure accurate messaging
              const movedNoteCount = noteCount;
              Alert.alert(
                'Confirm Deletion',
                `All notes in "${categoryName}" will be moved to "${fallbackCategory}". This action cannot be undone. Delete anyway?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await core.deleteCategory(
                          categoryName,
                          fallbackCategory,
                        );
                        Alert.alert(
                          'Success',
                          `Category deleted. ${movedNoteCount} note${movedNoteCount > 1 ? 's' : ''} moved to "${fallbackCategory}"`,
                        );
                      } catch (error) {
                        Alert.alert(
                          'Error',
                          (error as Error).message ||
                            'Failed to delete category',
                        );
                      }
                    },
                  },
                ],
              );
            },
          },
        ],
      );
    }
  };

  return (
    <StackScreen
      title="Manage Categories"
      subtitle={`${core.categories.length} categor${core.categories.length === 1 ? 'y' : 'ies'}`}
      keyboardShouldPersistTaps="handled"
      trailing={
        <IconButton
          name={isAdding ? 'close-outline' : 'add-circle-outline'}
          size={22}
          accessibilityLabel={
            isAdding ? 'Cancel adding category' : 'Add new category'
          }
          onPress={handleToggleAddCategory}
        />
      }
    >
      {isAdding ? (
        <View style={[styles.addCategoryForm, cardSurface(COLORS)]}>
          <FormInput
            label="Category name"
            placeholder="Category name..."
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            autoFocus
            accessibilityLabel="Enter category name"
          />
          <AppButton
            label="Save category"
            onPress={handleAddCategory}
            disabled={!newCategoryName.trim()}
            accessibilityLabel="Save new category"
            fullWidth
          />
        </View>
      ) : null}

      {core.categories.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          No categories yet.
        </Text>
      ) : (
        <GroupContainer>
          {core.categories.map((category, index) => {
            const noteCount = core.getCategoryNoteCount(category);
            return (
              <CategoryManagerRow
                key={category}
                name={category}
                count={`${noteCount} note${noteCount === 1 ? '' : 's'}`}
                onDelete={() => handleDeleteCategory(category)}
                showSeparator={index < core.categories.length - 1}
              />
            );
          })}
        </GroupContainer>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  addCategoryForm: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
