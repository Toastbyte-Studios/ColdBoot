import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardTopic from '../../components/CardTopic';
import Grid from '../../components/Grid';
import { HorizontalRule } from '../../components/HorizontalRule';
import IconButton from '../../components/IconButton';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useChecklistStore } from '../../stores';

/**
 * Checklist landing screen.
 *
 * @remarks
 * Presents a dashboard of checklist-related actions and routes:
 * - **New Checklist** → navigates to the `ComingSoon` screen (for now)
 * - **Checklist Cards** → mapped as CardTopic cards that navigate to individual checklist screens
 *
 * Uses React Navigation to perform screen transitions from card taps.
 *
 * @returns A screen layout containing a header, action buttons, and a grid of navigation cards.
 */
export default observer(function ChecklistScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const checklistStore = useChecklistStore();

  const checklistIcons: Record<string, string> = {
    'Bug-out bag': 'bag-outline',
    'First-aid kit': 'medical-outline',
    'Evacuation kit': 'exit-outline',
  };

  return (
    <ScreenBody>
      <SectionHeader>Checklists</SectionHeader>
      <View style={styles.checklistHeader}>
        <IconButton
          name="add-circle-outline"
          size={30}
          accessibilityLabel="New Checklist"
          onPress={() => navigation.navigate('ComingSoon')}
        />
      </View>
      <HorizontalRule />

      <Grid>
        {checklistStore.checklists.map((checklist) => (
          <CardTopic
            key={checklist.id}
            title={checklist.name}
            icon={checklistIcons[checklist.name] || 'list-outline'}
            onPress={() => navigation.navigate('ChecklistEntry', { checklist })}
          />
        ))}
      </Grid>
    </ScreenBody>
  );
});

const styles = StyleSheet.create({
  checklistHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
});
