import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/homePrep.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  Water: 'Water',
  Food: 'Food',
  PowerAndHeat: 'Power & Heat',
  Sanitation: 'Sanitation',
  Planning: 'Planning',
};

/** Exported so tests can check every data category has a row here. */
export const homePrepCategories: CategoryType[] = [
  {
    title: 'Water',
    icon: 'water-outline',
    id: 'homeprep_water',
    category: categoryMap.Water,
    data: data.entries,
  },
  {
    title: 'Food',
    icon: 'nutrition-outline',
    id: 'homeprep_food',
    category: categoryMap.Food,
    data: data.entries,
  },
  {
    title: 'Power & Heat',
    icon: 'flash-outline',
    id: 'homeprep_power_heat',
    category: categoryMap.PowerAndHeat,
    data: data.entries,
  },
  {
    title: 'Sanitation',
    icon: 'trash-outline',
    id: 'homeprep_sanitation',
    category: categoryMap.Sanitation,
    data: data.entries,
  },
  {
    title: 'Planning',
    icon: 'clipboard-outline',
    id: 'homeprep_planning',
    category: categoryMap.Planning,
    data: data.entries,
  },
];

/**
 * Renders the Home Prep reference screen.
 *
 * @remarks
 * The reading behind the Prepper tools: storing water and food, getting
 * through an outage, sanitation when the water is off, and planning ahead.
 * Backed by `homePrep.json`; rows open the shared category and entry screens.
 *
 * @returns A React element containing the Home Prep screen layout.
 */
export default function HomePrepScreen(): JSX.Element {
  const disclaimer: string = data.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Home Prep"
      disclaimer={disclaimer}
      categories={homePrepCategories}
    />
  );
}
