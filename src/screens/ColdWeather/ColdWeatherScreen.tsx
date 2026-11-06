import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { EntryItemList, EntrySection } from '../../components/EntrySection';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useCoreStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import {
  KEEP_PHONE_WARM,
  MAKE_BATTERY_LAST,
  stayingWarmEntries,
} from './coldWeatherContent';

const isAndroid = Platform.OS === 'android';

/** "5 hr 10 min", "45 min". */
function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs === 0) return `${mins} min`;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

/** One line for the battery card: level, and charging or time left. */
export function batterySummary(
  level: number | null,
  charging: boolean | null,
  minutesLeft: number | null,
): string {
  if (level == null) return 'Checking battery…';
  const pct = `${Math.round(level * 100)}%`;
  if (charging) return `${pct} · charging`;
  if (minutesLeft == null) return pct;
  return `${pct} · about ${formatMinutes(minutesLeft)} left`;
}

/**
 * Opens Android's Battery Saver page. Apps can't switch the saver on
 * themselves, so this is as close as one tap gets; settings home is the
 * fallback on builds that don't expose the page.
 */
function openBatterySaver() {
  Linking.sendIntent('android.settings.BATTERY_SAVER_SETTINGS').catch(() =>
    Linking.openSettings(),
  );
}

/**
 * Cold Weather: how to keep the phone working when it's freezing, and where
 * the app's guidance on staying warm lives.
 *
 * Cold is what kills a phone outdoors: the battery sags, the phone shuts off
 * with charge still showing, and charging a frozen battery damages it. The
 * fix is keeping the phone warm and the drain low, so the screen leads with
 * the battery and those two lists, then links to the Reference entries on
 * hypothermia, frostbite and shelter.
 */
const ColdWeatherScreen = observer(() => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const entries = useMemo(() => stayingWarmEntries(), []);

  return (
    <StackScreen title="Cold Weather">
      {/* Android content is full-bleed (see StackScreen); cards carry the
          gutter, lists reach the edge. */}
      <View style={styles.column}>
        <EntrySection title="Battery">
          <Text
            style={[styles.battery, { color: COLORS.PRIMARY_DARK }]}
            accessibilityLabel={`Battery ${batterySummary(
              core.batteryLevel,
              core.isCharging,
              core.batteryEstimateMinutes,
            )}`}
          >
            {batterySummary(
              core.batteryLevel,
              core.isCharging,
              core.batteryEstimateMinutes,
            )}
          </Text>
          <Text style={[styles.batteryNote, { color: COLORS.MUTED }]}>
            In the cold this can fall faster than it says, then recover once the
            phone warms up.
          </Text>
        </EntrySection>

        <EntrySection title="Keep your phone warm">
          <EntryItemList items={KEEP_PHONE_WARM} />
        </EntrySection>

        <EntrySection title="Make the battery last">
          <EntryItemList items={MAKE_BATTERY_LAST} />
        </EntrySection>
      </View>

      {isAndroid ? (
        <View style={styles.group}>
          <GroupContainer>
            <ModuleRow
              variant="tool"
              title="Open Battery Saver settings"
              icon="battery-half-outline"
              onPress={openBatterySaver}
              showSeparator={false}
            />
          </GroupContainer>
        </View>
      ) : null}

      <SectionEyebrow>Staying warm</SectionEyebrow>
      <GroupContainer>
        {entries.map((entry, index) => (
          <ModuleRow
            key={entry.id}
            variant="tool"
            title={entry.title}
            icon="snow-outline"
            onPress={() => navigation.navigate('Entry', { entry })}
            showSeparator={index < entries.length - 1}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});

export default ColdWeatherScreen;

const styles = StyleSheet.create({
  battery: {
    fontSize: 22,
    fontFamily: 'Bitter-Bold',
  },
  batteryNote: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: SPACING.xs,
  },
  column: {
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  group: {
    marginBottom: SPACING.xl,
  },
});
