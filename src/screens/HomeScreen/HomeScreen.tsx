import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { MODULES } from '../../../constants';
import ConnectionDot from '../../components/ConnectionDot';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import PinnedHeaderScreen from '../../components/PinnedHeaderScreen';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import { useCurrentDate } from '../../hooks/useCurrentDate';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, TEXT_GUTTER } from '../../theme';
import SolarCycleCard from './components/SolarCycleCard';
import { MODULE_SUBTITLES, MODULE_TOOL_COUNTS } from './moduleSubtitles';

const isAndroid = Platform.OS === 'android';

/**
 * The date and connection dot, on Android.
 *
 * Material's top app bar carries a title and actions and nothing else, so the
 * line iOS keeps under the wordmark lives here instead, in the content, above
 * the solar card.
 */
function SupportingLine() {
  const COLORS = useTheme();
  const currentDate = useCurrentDate();

  return (
    <View style={styles.supporting}>
      <Text
        style={[styles.supportingText, { color: COLORS.MUTED }]}
        accessibilityLabel={`Current date: ${currentDate}`}
      >
        {currentDate}
      </Text>
      <ConnectionDot />
    </View>
  );
}

/**
 * The app's landing screen: pick a module, and see the one time-critical fact
 * — the next solar event — without navigating anywhere.
 *
 * The module list follows `MODULES`, which is kept in alphabetical order.
 *
 * The solar card and the "Modules" label stay put; only the module list
 * scrolls (see `PinnedHeaderScreen`, which also handles Android's
 * edge-to-edge rows).
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();

  return (
    <PinnedHeaderScreen
      topInset={SPACING.xs}
      header={
        <>
          {isAndroid ? <SupportingLine /> : null}
          <SolarCycleCard />
          <SectionEyebrow>Modules</SectionEyebrow>
        </>
      }
    >
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
    </PinnedHeaderScreen>
  );
});

export default HomeScreen;

const styles = StyleSheet.create({
  supporting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: 2,
    paddingHorizontal: TEXT_GUTTER,
    paddingBottom: 10,
  },
  supportingText: {
    fontSize: 14,
    fontWeight: '400',
  },
});
