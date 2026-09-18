import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/health.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  Emergency: 'Emergency',
  Illness: 'Illness',
  Injury: 'Injury',
  Preventative: 'Preventive',
};

const healthCategories: CategoryType[] = [
  {
    title: 'Emergency',
    icon: 'alert-outline',
    id: 'health_emergency',
    category: categoryMap.Emergency,
    data: data.entries,
  },
  {
    title: 'Illness',
    icon: 'medkit-outline',
    id: 'health_illness',
    category: categoryMap.Illness,
    data: data.entries,
  },
  {
    title: 'Injury',
    icon: 'bandage-outline',
    id: 'health_injury',
    category: categoryMap.Injury,
    data: data.entries,
  },
  {
    title: 'Preventive',
    icon: 'shield-checkmark-outline',
    id: 'health_preventive',
    category: categoryMap.Preventative,
    data: data.entries,
  },
];

/**
 * Displays the Health reference screen, providing navigation to various health-related categories.
 *
 * This screen presents a list of categories including Emergency, Illness, Injury, and Preventive,
 * each shown as a row in a grouped list. Selecting a row navigates to the 'Category' screen
 * with the corresponding category data.
 *
 * @returns {JSX.Element} The rendered HealthScreen component.
 */
export default function HealthScreen(): JSX.Element {
  const disclaimer: string = data?.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Health"
      icon="medkit-outline"
      disclaimer={disclaimer}
      categories={healthCategories}
    />
  );
}
