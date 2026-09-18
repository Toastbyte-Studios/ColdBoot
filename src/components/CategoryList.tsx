import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { JSX, useMemo } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { CategoryType } from '../types/common-types';
import GroupContainer from './GroupContainer';
import ModuleRow from './ModuleRow';
import StackScreen from './StackScreen';

type CategoryListProps = {
  /** Screen title, e.g. "Health". */
  title: string;
  /** Ionicons glyph for the topic, shown at the trailing edge of the title. */
  icon: string;
  categories: CategoryType<unknown>[];
  disclaimer?: string;
  /** Screen to open for a category. @default 'Category' */
  categoryScreen?: string;
  /** Extra actions for the title row, rendered before the topic glyph. */
  actions?: React.ReactNode;
};

/**
 * Counts the entries that belong to a category.
 *
 * The category screens filter `data` by `entry.category === title`, so the
 * count uses the same test — the number on the row is the number of rows the
 * user will see after tapping it.
 */
function countEntries(category: CategoryType<unknown>): number {
  return category.data.filter(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as { category?: unknown }).category === category.title,
  ).length;
}

/**
 * A topic screen: a titled, grouped list of categories.
 *
 * Previously a grid of gradient `CardTopic` tiles under a bare title, which is
 * why the redesign appeared to stop one level into a module. Categories are
 * now rows in one grouped list, the same as tools on a module screen, and the
 * screen carries the module screen's header — back control, title, count.
 *
 * Each row navigates to `categoryScreen` with the category's title, data and
 * the topic's disclaimer, exactly as before.
 */
export default function CategoryList({
  title,
  icon,
  categories,
  disclaimer = '',
  categoryScreen = 'Category',
  actions,
}: CategoryListProps): JSX.Element {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Sort categories alphabetically by title
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.title.localeCompare(b.title)),
    [categories],
  );

  const subtitle = `${categories.length} categor${
    categories.length === 1 ? 'y' : 'ies'
  } · all offline`;

  return (
    <StackScreen
      title={title}
      subtitle={subtitle}
      note={disclaimer.trim() || undefined}
      trailing={
        <>
          {actions}
          <Ionicons name={icon} size={30} color={COLORS.BRAND} />
        </>
      }
    >
      <GroupContainer>
        {sortedCategories.map((category, index) => {
          const count = countEntries(category);
          return (
            <ModuleRow
              key={category.id}
              title={category.title}
              icon={category.icon}
              variant="tool"
              subtitle={
                count > 0
                  ? `${count} topic${count === 1 ? '' : 's'}`
                  : undefined
              }
              showSeparator={index < sortedCategories.length - 1}
              onPress={() =>
                navigation.navigate(categoryScreen, {
                  title: category.title,
                  data: category.data,
                  disclaimer: disclaimer,
                })
              }
            />
          );
        })}
      </GroupContainer>
    </StackScreen>
  );
}
