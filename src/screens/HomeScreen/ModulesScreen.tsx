import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { MODULES } from '../../../constants';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { MODULE_SUBTITLES, MODULE_TOOL_COUNTS } from './moduleSubtitles';

const isAndroid = Platform.OS === 'android';

/**
 * The Modules tab: the full module list, with a title and no solar card.
 *
 * The handoff left this tab undesigned, noting it would otherwise repeat
 * Home's list. It does repeat it — deliberately: a tab that navigates
 * somewhere the user already is would be worse than one that gives the list
 * its own titled screen. Worth revisiting once the tab earns content of its
 * own.
 *
 * It uses `StackScreen` for the frame even though it is a tab root rather than
 * a pushed screen: the frame is the same, and `StackScreen` only draws a back
 * control when there is something to go back to, which at a tab root there is
 * not.
 */
export default function ModulesScreen() {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();

  const modules = useMemo(
    () => [...MODULES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  return (
    <StackScreen title="Modules" subtitle="Everything ColdBoot can do">
      <GroupContainer>
        {modules.map((module, index) => (
          <ModuleRow
            key={module.id}
            title={module.name}
            icon={module.icon}
            subtitle={MODULE_SUBTITLES[module.id]}
            value={
              isAndroid
                ? String(MODULE_TOOL_COUNTS[module.id] ?? '')
                : undefined
            }
            showSeparator={index < modules.length - 1}
            onPress={() => navigation.navigate(module.screen)}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
}
