import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/emergency.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  ImmediateAction: 'Immediate Action',
  LostPerson: 'Lost Person',
  Signaling: 'Signaling',
  SearchAndRescue: 'Search and Rescue',
  Evacuation: 'Evacuation',
  ShelterAndSurvivalPriorities: 'Shelter & Survival Priorities',
};

const emergencyCategories: CategoryType[] = [
  {
    title: 'Immediate Action',
    icon: 'alert-circle-outline',
    id: 'immediate_action_stop_assess_plan',
    category: categoryMap.ImmediateAction,
    data: data.entries,
  },
  {
    title: 'Lost Person',
    icon: 'help-buoy-outline',
    id: 'lost_person_stay_put_rule',
    category: categoryMap.LostPerson,
    data: data.entries,
  },
  {
    title: 'Signaling',
    icon: 'megaphone-outline',
    id: 'signaling_principles_make_yourself_findable',
    category: categoryMap.Signaling,
    data: data.entries,
  },
  {
    title: 'Search and Rescue',
    icon: 'search-outline',
    id: 'sar_when_searchers_are_likely',
    category: categoryMap.SearchAndRescue,
    data: data.entries,
  },
  {
    title: 'Evacuation',
    icon: 'log-out-outline',
    id: 'evacuation_go_no_go_assessment',
    category: categoryMap.Evacuation,
    data: data.entries,
  },
  {
    title: 'Shelter & Survival Priorities',
    icon: 'home-outline',
    id: 'shelter_priorities_survive_the_night',
    category: categoryMap.ShelterAndSurvivalPriorities,
    data: data.entries,
  },
];

/**
 * Renders the Emergency reference screen.
 *
 * @remarks
 * Displays a branded header and a list of emergency-related reference categories for quick access.
 *
 * @returns A React element containing the Emergency screen layout.
 */
export default function EmergencyScreen(): JSX.Element {
  const disclaimer: string = data.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Emergency"
      icon="warning-outline"
      disclaimer={disclaimer}
      categories={emergencyCategories}
    />
  );
}
