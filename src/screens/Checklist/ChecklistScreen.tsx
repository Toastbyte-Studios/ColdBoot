import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useChecklistStore } from '../../stores';
import ChecklistHero from './ChecklistHero';
import {
  checklistHeroState,
  checklistProgress,
  progressText,
} from './checklistHero';

/**
 * Checklist landing screen.
 *
 * @remarks
 * Presents a dashboard of checklist-related actions and routes:
 * - **New Checklist** → navigates to the `NewChecklist` screen
 * - **Hero** → the list to finish next and overall progress (see `ChecklistHero`)
 * - **Checklist Cards** → listed as rows in one grouped list that navigate to individual checklist screens
 *
 * Uses React Navigation to perform screen transitions from row taps.
 *
 * @returns A screen layout containing a title row with action buttons and a grouped list of navigation rows.
 */
export default observer(function ChecklistScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const checklistStore = useChecklistStore();
  const sortedChecklists = [...checklistStore.checklists].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  const progress = checklistProgress(sortedChecklists, (id) =>
    checklistStore.getChecklistItems(id),
  );
  const heroState = checklistHeroState(progress);

  const checklistIcons: Record<string, string> = {
    'Bug-out bag': 'bag-outline',
    'First-aid kit': 'medical-outline',
    'Evacuation kit': 'exit-outline',
  };

  return (
    <StackScreen
      title="Checklists"
      trailing={
        <>
          <IconButton
            name="add-circle-outline"
            size={22}
            accessibilityLabel="New Checklist"
            onPress={() => navigation.navigate('NewChecklist')}
          />
        </>
      }
    >
      <ChecklistHero state={heroState} />
      <SectionEyebrow>Lists</SectionEyebrow>
      <GroupContainer>
        {progress.map((entry, index, all) => (
          <ModuleRow
            key={entry.checklist.id}
            title={entry.checklist.name}
            icon={checklistIcons[entry.checklist.name] || 'list-outline'}
            value={progressText(entry)}
            variant="tool"
            showSeparator={index < all.length - 1}
            onPress={() =>
              navigation.navigate('ChecklistEntry', {
                checklist: entry.checklist,
              })
            }
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
