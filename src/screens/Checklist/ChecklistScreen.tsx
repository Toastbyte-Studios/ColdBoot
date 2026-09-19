import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useChecklistStore } from '../../stores';

/**
 * Checklist landing screen.
 *
 * @remarks
 * Presents a dashboard of checklist-related actions and routes:
 * - **New Checklist** → navigates to the `NewChecklist` screen
 * - **Checklist Cards** → listed as rows in one grouped list that navigate to individual checklist screens
 *
 * Uses React Navigation to perform screen transitions from row taps.
 *
 * @returns A screen layout containing a title row with action buttons and a grouped list of navigation rows.
 */
export default observer(function ChecklistScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const checklistStore = useChecklistStore();
  const sortedChecklists = useMemo(
    () =>
      [...checklistStore.checklists].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [checklistStore.checklists],
  );

  const checklistIcons: Record<string, string> = {
    'Bug-out bag': 'bag-outline',
    'First-aid kit': 'medical-outline',
    'Evacuation kit': 'exit-outline',
  };

  return (
    <StackScreen
      title="Checklists"
      subtitle={`${checklistStore.checklists.length} list${checklistStore.checklists.length === 1 ? '' : 's'}`}
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
      <GroupContainer>
        {sortedChecklists.map((checklist, index, all) => (
          <ModuleRow
            key={checklist.id}
            title={checklist.name}
            icon={checklistIcons[checklist.name] || 'list-outline'}
            variant="tool"
            showSeparator={index < all.length - 1}
            onPress={() => navigation.navigate('ChecklistEntry', { checklist })}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
