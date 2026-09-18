import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/tools.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  ToolsHome: 'Tools (Home)',
  ToolsWilderness: 'Tools (Wilderness)',
  Knots: 'Knots',
};

const toolsAndKnotsCategories: CategoryType[] = [
  {
    title: 'Tools (Home)',
    icon: 'hammer-outline',
    id: 'tools_home',
    category: categoryMap.ToolsHome,
    data: data.entries,
  },
  {
    title: 'Tools (Wilderness)',
    icon: 'leaf-outline',
    id: 'tools_wilderness',
    category: categoryMap.ToolsWilderness,
    data: data.entries,
  },
  {
    title: 'Knots',
    icon: 'git-branch-outline',
    id: 'knots',
    category: categoryMap.Knots,
    data: data.entries,
  },
];

/**
 * Renders the Reference "Tools and Knots" screen.
 *
 * Displays the app logo header, a section title, and a categorized list of
 * tools and knots using {@link CategoryList} with {@link toolsAndKnotsCategories}.
 *
 * @returns The Tools and Knots screen JSX layout.
 */
export default function ToolsAndKnotsScreen(): JSX.Element {
  const disclaimer: string = data.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Tools and Knots"
      icon="hammer-outline"
      disclaimer={disclaimer}
      categories={toolsAndKnotsCategories}
    />
  );
}
