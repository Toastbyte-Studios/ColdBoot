import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/roadside.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  TiresAndWheels: 'Tires & Wheels',
};

const roadsideCategories: CategoryType[] = [
  {
    title: 'Tires & Wheels',
    icon: 'disc-outline',
    id: 'roadside_tires_wheels',
    category: categoryMap.TiresAndWheels,
    data: data.entries,
  },
];

/**
 * Renders the Roadside reference screen.
 *
 * @remarks
 * Lists roadside service categories (tires, battery, engine, recovery,
 * safety, vehicle kit) backed by `roadside.json`. Each row opens the shared
 * category screen, and entries render on the shared entry screen.
 *
 * @returns A React element containing the Roadside screen layout.
 */
export default function RoadsideScreen(): JSX.Element {
  const disclaimer: string = data.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Roadside"
      icon="car-outline"
      disclaimer={disclaimer}
      categories={roadsideCategories}
    />
  );
}
