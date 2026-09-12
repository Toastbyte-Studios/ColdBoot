import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { MODULES } from '../../../constants';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import ScreenBody from '../../components/ScreenBody';
import SectionEyebrow from '../../components/SectionEyebrow';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { SCREEN_GUTTER } from '../../theme';
import SolarCycleCard from './components/SolarCycleCard';
import { MODULE_SUBTITLES } from './moduleSubtitles';

/**
 * The app's landing screen: pick a module, and see the one time-critical fact
 * — the next solar event — without navigating anywhere.
 *
 * The module list preserves the long-standing module order from `MODULES`, so
 * the redesigned shell still opens in the sequence users already know.
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const footerClearance = useFooterClearance();

  return (
    <ScreenBody>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <SolarCycleCard />

        <SectionEyebrow>Modules</SectionEyebrow>
        <GroupContainer>
          {MODULES.map((module, index) => (
            <ModuleRow
              key={module.id}
              title={module.name}
              icon={module.icon}
              subtitle={MODULE_SUBTITLES[module.id]}
              showSeparator={index < MODULES.length - 1}
              onPress={() => navigation.navigate(module.screen)}
            />
          ))}
        </GroupContainer>
      </ScrollView>
    </ScreenBody>
  );
});

export default HomeScreen;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 4,
  },
});
