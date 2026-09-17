import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { MODULES } from '../../../constants';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { SCREEN_GUTTER, SCREEN_INSET, TEXT_GUTTER } from '../../theme';
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
        style={[styles.scroll, isAndroid && styles.bleed]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <SectionHeader
          title="Modules"
          subtitle="Everything ColdBoot can do"
          containerStyle={isAndroid ? styles.headline : undefined}
        />
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
  bleed: {
    // See HomeScreen: `width: 'auto'` is what turns the negative margins into
    // extra width rather than a sideways shift.
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  content: {
    paddingHorizontal: isAndroid ? 0 : SCREEN_GUTTER,
  },
  headline: {
    paddingHorizontal: TEXT_GUTTER,
  },
});
