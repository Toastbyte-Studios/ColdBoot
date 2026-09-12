import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { REFERENCE_TOOLS } from '../../../constants';
import IconButton from '../../components/IconButton';
import ModuleScreen from '../../components/ModuleScreen';

/**
 * The Reference module: the offline library.
 *
 * Keeps its bookmarks entry point, which no other module has, in the title
 * row's trailing slot.
 */
export default function ReferenceModule() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <ModuleScreen
      title="Reference"
      icon="book-outline"
      tools={REFERENCE_TOOLS}
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
