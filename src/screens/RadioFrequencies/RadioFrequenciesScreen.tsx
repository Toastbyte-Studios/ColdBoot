import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import radioFrequenciesData from '../../data/radioFrequencies.json';
import { SPACING } from '../../theme';

const radioCategories = [
  { id: 'HAM', title: 'HAM', icon: 'radio-outline' },
  { id: 'CB', title: 'CB', icon: 'chatbubbles-outline' },
  { id: 'GMRS', title: 'GMRS', icon: 'wifi-outline' },
  { id: 'FRS', title: 'FRS', icon: 'phone-portrait-outline' },
  { id: 'MURS', title: 'MURS', icon: 'headset-outline' },
];

/**
 * Displays radio frequency categories for different communication systems.
 *
 * Shows categories for HAM, CB, GMRS, FRS, and MURS radio frequencies as rows
 * in one grouped list, with a Local Repeaters entry (powered by RepeaterBook)
 * in its own group below. StackScreen keeps the content clear of the shortcut bar.
 *
 * @component
 * @returns {JSX.Element} The rendered radio frequencies screen.
 */
export default function RadioFrequenciesScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const disclaimer: string = radioFrequenciesData.metadata?.disclaimer ?? '';

  const handleCategoryPress = (categoryId: string) => {
    const frequencyData =
      radioFrequenciesData.frequencies[
        categoryId as keyof typeof radioFrequenciesData.frequencies
      ];

    if (frequencyData) {
      navigation.navigate('RadioFrequencyDetail', { frequencyData });
    }
  };

  return (
    <StackScreen
      title="Radio Frequencies"
      subtitle={`${radioCategories.length} categories · all offline`}
      note={disclaimer.trim() || undefined}
    >
      <GroupContainer>
        {radioCategories.map((category, index) => (
          <ModuleRow
            key={category.id}
            title={category.title}
            icon={category.icon}
            variant="tool"
            showSeparator={index < radioCategories.length - 1}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </GroupContainer>

      {/* Not a frequency category: a lookup of nearby repeaters, so it gets
          its own group rather than sitting last in the list above. */}
      <View style={styles.nearby}>
        <SectionEyebrow>Nearby</SectionEyebrow>
        <GroupContainer>
          <ModuleRow
            title="Local Repeaters"
            icon="location-outline"
            variant="tool"
            showSeparator={false}
            onPress={() => navigation.navigate('RepeaterBook')}
          />
        </GroupContainer>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  nearby: {
    marginTop: SPACING.lg,
  },
});
