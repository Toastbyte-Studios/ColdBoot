import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../components/AppButton';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { usePantryStore } from '../../stores';
import {
  ROW_MIN_HEIGHT,
  ROW_PADDING_HORIZONTAL,
  ROW_PADDING_VERTICAL,
  SCREEN_GUTTER,
  SPACING,
  TEXT_GUTTER,
} from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { FormInput } from '../Shared/Prepper';

const isAndroid = Platform.OS === 'android';

/**
 * Screen for managing pantry categories.
 *
 * Allows users to:
 * - View all categories
 * - Add new categories
 * - Delete existing categories (with warnings)
 *
 * @returns {React.JSX.Element} The rendered manage pantry categories screen component.
 */
export default observer(
  function ManagePantryCategoriesScreen(): React.JSX.Element {
    const pantry = usePantryStore();
    const COLORS = useTheme();
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
      try {
        await pantry.addCategory(trimmedName);
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
      const itemCount = pantry.getCategoryItemCount(categoryName);

      if (itemCount === 0) {
        // No items in category - single warning
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
                  await pantry.deleteCategory(categoryName);
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
        // Category has items - first warning
        Alert.alert(
          'Delete Category',
          `This category contains ${itemCount} item${itemCount > 1 ? 's' : ''}. Are you sure you want to delete it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // Second warning with reassignment confirmation
                const fallbackCategory = pantry.categories.find(
                  (c) => c !== categoryName,
                );
                if (!fallbackCategory) {
                  Alert.alert('Error', 'No fallback category available');
                  return;
                }
                // Capture item count before async operation to ensure accurate messaging
                const movedItemCount = itemCount;
                Alert.alert(
                  'Confirm Deletion',
                  `All items in "${categoryName}" will be moved to "${fallbackCategory}". This action cannot be undone. Delete anyway?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await pantry.deleteCategory(
                            categoryName,
                            fallbackCategory,
                          );
                          Alert.alert(
                            'Success',
                            `Category deleted. ${movedItemCount} item${movedItemCount > 1 ? 's' : ''} moved to "${fallbackCategory}"`,
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
        title="Manage Pantry Categories"
        subtitle={`${pantry.categories.length} categor${pantry.categories.length === 1 ? 'y' : 'ies'}`}
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

        {pantry.categories.length === 0 ? (
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
            {pantry.categories.map((category, index) => {
              const itemCount = pantry.getCategoryItemCount(category);
              return (
                <View key={category}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <View
                        style={[
                          styles.iconTile,
                          {
                            backgroundColor: isAndroid
                              ? COLORS.SECONDARY_CONTAINER
                              : COLORS.SURFACE_CONTAINER,
                          },
                        ]}
                      >
                        <Icon
                          name="folder-outline"
                          size={20}
                          color={
                            isAndroid
                              ? COLORS.ON_SECONDARY_CONTAINER
                              : COLORS.BRAND
                          }
                        />
                      </View>
                      <View style={styles.categoryTextContainer}>
                        <Text
                          style={[
                            styles.categoryName,
                            { color: COLORS.PRIMARY_DARK },
                          ]}
                        >
                          {category}
                        </Text>
                        <Text
                          style={[
                            styles.categoryCount,
                            { color: COLORS.MUTED },
                          ]}
                        >
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <IconButton
                      name="trash-outline"
                      size={22}
                      color={COLORS.ERROR}
                      accessibilityLabel={`Delete ${category} category`}
                      onPress={() => handleDeleteCategory(category)}
                    />
                  </View>
                  {index < pantry.categories.length - 1 ? (
                    <View
                      style={[
                        styles.separator,
                        {
                          backgroundColor: isAndroid
                            ? COLORS.OUTLINE_VARIANT
                            : COLORS.SEPARATOR,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              );
            })}
          </GroupContainer>
        )}
      </StackScreen>
    );
  },
);

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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingHorizontal: ROW_PADDING_HORIZONTAL,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: isAndroid ? 16 : 13,
  },
  iconTile: {
    width: isAndroid ? 40 : 34,
    height: isAndroid ? 40 : 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 13,
  },
  separator: {
    height: isAndroid ? 1 : StyleSheet.hairlineWidth,
    marginLeft: isAndroid ? 72 : 61,
  },
});
