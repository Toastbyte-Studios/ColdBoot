import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { REFERENCE_TOOLS } from '../../../constants';
import { HorizontalRule } from '../../components/HorizontalRule';
import IconButton from '../../components/IconButton';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import ToolList from '../../components/ToolList';

/**
 * Renders the Reference screen.
 *
 * Displays a section header labeled "Reference", an action bar with a bookmark icon,
 * and a list of available reference tools.
 *
 * @returns A React element containing the Reference screen layout.
 */
export default function ReferenceModule() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <ScreenBody>
      <SectionHeader>Reference</SectionHeader>
      <View style={styles.actionBar}>
        <IconButton
          name="bookmark-outline"
          size={30}
          onPress={() => navigation.navigate('Bookmark')}
          accessibilityLabel="Bookmarks"
        />
      </View>
      <HorizontalRule />
      <ToolList tools={REFERENCE_TOOLS} />
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
});
