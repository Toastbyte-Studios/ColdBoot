import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { MODULES } from '../../../constants';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { SCREEN_GUTTER } from '../../theme';
import { MODULE_SUBTITLES } from './moduleSubtitles';

/**
 * The Modules tab: the full module list, with a title and no solar card.
 *
 * The handoff left this tab undesigned, noting it would otherwise repeat
 * Home's list. It does repeat it — deliberately: a tab that navigates
 * somewhere the user already is would be worse than one that gives the list
 * its own titled screen. Worth revisiting once the tab earns content of its
 * own.
 */
export default function ModulesScreen() {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const footerClearance = useFooterClearance();

  const modules = useMemo(
    () => [...MODULES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  return (
    <ScreenBody>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <SectionHeader title="Modules" subtitle="Everything ColdBoot can do" />
        <GroupContainer>
          {modules.map((module, index) => (
            <ModuleRow
              key={module.id}
              title={module.name}
              icon={module.icon}
              subtitle={MODULE_SUBTITLES[module.id]}
              showSeparator={index < modules.length - 1}
              onPress={() => navigation.navigate(module.screen)}
            />
          ))}
        </GroupContainer>
      </ScrollView>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
  },
});
