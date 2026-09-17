import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { MODULES } from '../../../constants';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionEyebrow from '../../components/SectionEyebrow';
import { useCurrentDate } from '../../hooks/useCurrentDate';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SCREEN_INSET, TEXT_GUTTER } from '../../theme';
import SolarCycleCard from './components/SolarCycleCard';
import { MODULE_SUBTITLES, MODULE_TOOL_COUNTS } from './moduleSubtitles';

const isAndroid = Platform.OS === 'android';

/**
 * The date and offline status, on Android.
 *
 * Material's top app bar carries a title and actions and nothing else, so the
 * line iOS keeps under the wordmark lives here instead — in the content, where
 * it scrolls away once the user has read it.
 */
function SupportingLine() {
  const COLORS = useTheme();
  const currentDate = useCurrentDate();

  return (
    <Text
      style={[styles.supporting, { color: COLORS.MUTED }]}
      accessibilityLabel={`Current date: ${currentDate}`}
    >
      {currentDate} · Offline ready
    </Text>
  );
}

/**
 * The app's landing screen: pick a module, and see the one time-critical fact
 * — the next solar event — without navigating anywhere.
 *
 * The module list preserves the long-standing module order from `MODULES`, so
 * the redesigned shell still opens in the sequence users already know.
 *
 * On Android the gutter is applied per-child rather than to the scroll
 * content: list items run edge to edge while the solar card above them stays
 * inset, so there is no single padding that suits both. The scroll view also
 * cancels `ScreenContainer`'s own inset, which is what lets the rows and their
 * dividers actually reach the screen edge.
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const footerClearance = useFooterClearance();

  return (
    <ScreenBody>
      <ScrollView
        style={[styles.scroll, isAndroid && styles.bleed]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        {isAndroid ? <SupportingLine /> : null}

        <SolarCycleCard />

        <SectionEyebrow>Modules</SectionEyebrow>
        <GroupContainer>
          {MODULES.map((module, index) => (
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
  bleed: {
    // `width: 'auto'` matters: with an explicit 100% the negative margins
    // would slide the scroll view sideways instead of widening it.
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  content: {
    paddingHorizontal: isAndroid ? 0 : SCREEN_GUTTER,
    paddingTop: 4,
  },
  supporting: {
    fontSize: 14,
    fontWeight: '400',
    paddingTop: 2,
    paddingHorizontal: TEXT_GUTTER,
    paddingBottom: 10,
  },
});
