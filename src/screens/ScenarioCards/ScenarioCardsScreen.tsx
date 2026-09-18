import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import IconButton from '../../components/IconButton';
import data from '../../data/scenarioCards.json';

const categoryMap: Record<string, string> = {
  'Power & Infrastructure': 'Power & Infrastructure',
  'Natural Disasters': 'Natural Disasters',
  'Medical & Health': 'Medical & Health',
  'Urban Survival': 'Urban Survival',
  'Wilderness & Travel': 'Wilderness & Travel',
  'Psychological & Decision': 'Psychological & Decision',
  'Quick Thinking': 'Quick Thinking',
};

const scenarioCategories = [
  {
    title: 'Power & Infrastructure',
    icon: 'flash-off-outline',
    id: 'scenario_power',
    category: categoryMap['Power & Infrastructure'],
    data: data.entries,
  },
  {
    title: 'Natural Disasters',
    icon: 'thunderstorm-outline',
    id: 'scenario_disasters',
    category: categoryMap['Natural Disasters'],
    data: data.entries,
  },
  {
    title: 'Medical & Health',
    icon: 'medical-outline',
    id: 'scenario_medical',
    category: categoryMap['Medical & Health'],
    data: data.entries,
  },
  {
    title: 'Urban Survival',
    icon: 'business-outline',
    id: 'scenario_urban',
    category: categoryMap['Urban Survival'],
    data: data.entries,
  },
  {
    title: 'Wilderness & Travel',
    icon: 'navigate-outline',
    id: 'scenario_wilderness',
    category: categoryMap['Wilderness & Travel'],
    data: data.entries,
  },
  {
    title: 'Psychological & Decision',
    icon: 'people-outline',
    id: 'scenario_psychological',
    category: categoryMap['Psychological & Decision'],
    data: data.entries,
  },
  {
    title: 'Quick Thinking',
    icon: 'flash-outline',
    id: 'scenario_quick',
    category: categoryMap['Quick Thinking'],
    data: data.entries,
  },
];

/**
 * Displays the Scenario Cards screen, providing navigation to various emergency scenario categories.
 *
 * This screen presents a grouped list of categories including Power & Infrastructure, Natural Disasters,
 * Medical & Health, Urban Survival, Wilderness & Travel, Psychological & Decision, and Quick Thinking.
 * Selecting a row navigates to the 'ScenarioCategory' screen with the corresponding category data.
 *
 * The bookmarked-scenarios action sits in the title row, as Reference's does.
 *
 * @returns {JSX.Element} The rendered ScenarioCardsScreen component.
 */
export default function ScenarioCardsScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const disclaimer: string = data?.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Scenario Cards"
      icon="albums-outline"
      disclaimer={disclaimer}
      categories={scenarioCategories}
      categoryScreen="ScenarioCategory"
      actions={
        <IconButton
          name="bookmark-outline"
          size={22}
          accessibilityLabel="Bookmarked Scenarios"
          onPress={() => navigation.navigate('ScenarioBookmarks')}
        />
      }
    />
  );
}
