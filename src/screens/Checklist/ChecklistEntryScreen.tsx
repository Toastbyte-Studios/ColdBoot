import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { useChecklistStore } from '../../stores';
import { Checklist } from '../../stores/ChecklistStore';
import {
  RADIUS,
  ROW_PADDING_HORIZONTAL,
  SCREEN_GUTTER,
  SPACING,
  TEXT_GUTTER,
} from '../../theme';

const isAndroid = Platform.OS === 'android';

type ChecklistEntryRouteProp = RouteProp<
  { ChecklistEntry: { checklist: Checklist } },
  'ChecklistEntry'
>;

/**
 * Displays a single checklist with its items.
 *
 * This screen retrieves a checklist from the navigation route parameters and displays
 * it with all its items. Users can check/uncheck items, add new items, and delete items.
 *
 * @returns {React.JSX.Element} The rendered checklist entry screen component.
 */
export default observer(function ChecklistEntryScreen(): React.JSX.Element {
  const route = useRoute<ChecklistEntryRouteProp>();
  const navigation = useNavigation();
  const checklistStore = useChecklistStore();
  const COLORS = useTheme();
  const [newItemText, setNewItemText] = useState<string>('');
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  const { checklist } = route.params || {};

  if (!checklist) {
    return (
      <StackScreen title="Checklist not found">
        <Text
          style={[
            styles.errorText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          The requested checklist could not be found.
        </Text>
      </StackScreen>
    );
  }

  const checklistName = checklist.name || '(Untitled)';
  const items = checklistStore.getChecklistItems(checklist.id);
  const shouldShowAddItemInput = isAddingItem || items.length === 0;

  const handleAddItem = async () => {
    if (newItemText.trim()) {
      await checklistStore.addChecklistItem(checklist.id, newItemText.trim());
      setNewItemText('');
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await checklistStore.deleteChecklistItem(itemId);
        },
      },
    ]);
  };

  const handleDeleteChecklist = () => {
    Alert.alert(
      'Delete Checklist',
      'Are you sure you want to delete this checklist and all its items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await checklistStore.deleteChecklist(checklist.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <StackScreen
      title={checklistName}
      subtitle={
        items.length === 0
          ? 'No items yet'
          : `${checkedCount} of ${items.length} done`
      }
      keyboardShouldPersistTaps="handled"
      trailing={
        <>
          <IconButton
            name="add-circle-outline"
            size={22}
            accessibilityLabel="Add item"
            onPress={() => setIsAddingItem(true)}
          />
          <IconButton
            name="trash-outline"
            size={22}
            color={COLORS.ERROR}
            accessibilityLabel="Delete checklist"
            onPress={handleDeleteChecklist}
          />
        </>
      }
    >
      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="clipboard-outline" size={48} color={COLORS.MUTED} />
          <Text style={[styles.emptyText, { color: COLORS.MUTED }]}>
            No items yet
          </Text>
          <Text style={[styles.emptySubtext, { color: COLORS.MUTED }]}>
            Add your first item below.
          </Text>
        </View>
      )}

      {shouldShowAddItemInput && (
        <View style={styles.addItemRow}>
          <TextInput
            style={[
              styles.input,
              {
                color: COLORS.PRIMARY_DARK,
                borderColor: COLORS.BORDER,
                backgroundColor: COLORS.SURFACE_CONTAINER,
              },
            ]}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Enter item text..."
            placeholderTextColor={COLORS.MUTED}
            autoFocus
            onSubmitEditing={handleAddItem}
            accessibilityLabel="New item text"
          />
          <IconButton
            name="checkmark-circle-outline"
            size={26}
            accessibilityLabel="Save item"
            onPress={handleAddItem}
          />
          <IconButton
            name="close-circle-outline"
            size={26}
            accessibilityLabel="Cancel"
            onPress={() => {
              setNewItemText('');
              if (items.length > 0) {
                setIsAddingItem(false);
              }
            }}
          />
        </View>
      )}

      {items.length > 0 && (
        <GroupContainer>
          {items.map((item, index) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <Touchable
                  style={styles.checkbox}
                  borderless
                  onPress={() => checklistStore.toggleChecklistItem(item.id)}
                  accessibilityLabel={
                    item.checked ? 'Uncheck item' : 'Check item'
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                >
                  <Icon
                    name={item.checked ? 'checkbox-outline' : 'square-outline'}
                    size={26}
                    color={item.checked ? COLORS.BRAND : COLORS.MUTED}
                  />
                </Touchable>
                <Text
                  style={[
                    styles.itemText,
                    item.checked && [
                      styles.itemTextChecked,
                      { color: COLORS.MUTED },
                    ],
                  ]}
                >
                  {item.text}
                </Text>
                <IconButton
                  name="close-circle-outline"
                  size={22}
                  color={COLORS.MUTED}
                  accessibilityLabel="Delete item"
                  onPress={() => handleDeleteItem(item.id)}
                />
              </View>
              {index < items.length - 1 ? (
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
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  errorText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    // StackScreen's Android content is full-bleed; the field carries the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: RADIUS.tileSmall,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingRight: ROW_PADDING_HORIZONTAL,
  },
  checkbox: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
  },
  separator: {
    height: isAndroid ? 1 : StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
});
