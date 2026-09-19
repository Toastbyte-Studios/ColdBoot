import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { conversionCategories } from '../../utils/unitConversions';

/**
 * UnitConversionScreen displays all available unit conversion categories.
 *
 * Users can select a category to navigate to the conversion screen for that category.
 * Categories include Length, Weight, Volume, Temperature, Area, Speed, Pressure,
 * Energy, Time, Compass/Angles, Fuel, and Light.
 *
 * @returns A React element rendering the unit conversion categories as a grouped list.
 */
export default function UnitConversionScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const openCategory = (categoryId: string) => {
    navigation.navigate('ConversionCategory', { categoryId });
  };

  return (
    <StackScreen
      title="Unit Conversion"
      subtitle={`${conversionCategories.length} converters · all offline`}
    >
      <GroupContainer>
        {conversionCategories.map((category, index) => (
          <ModuleRow
            key={category.id}
            title={category.name}
            icon={category.icon}
            variant="tool"
            showSeparator={index < conversionCategories.length - 1}
            onPress={() => openCategory(category.id)}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
}
