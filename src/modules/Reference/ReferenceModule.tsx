import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { REFERENCE_TOOLS } from '../../../constants';
import IconButton from '../../components/IconButton';
import ModuleScreen from '../../components/ModuleScreen';
import ReferenceHero from './ReferenceHero';

/**
 * The Reference module: the offline library.
 *
 * Keeps its bookmarks entry point, which no other module has, in the title
 * row's trailing slot. The hero suggests what to read now.
 */
export default function ReferenceModule() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <ModuleScreen
      title="Reference"
      tools={REFERENCE_TOOLS}
      hero={<ReferenceHero />}
      trailing={
        <IconButton
          name="bookmark-outline"
          size={22}
          onPress={() => navigation.navigate('Bookmark')}
          accessibilityLabel="Bookmarks"
        />
      }
    />
  );
}
