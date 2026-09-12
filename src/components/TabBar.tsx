import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from '../navigation/navigationRef';
import { FOOTER_HEIGHT } from '../theme';
import { onColor, withAlpha } from '../theme/colorUtils';
import { useVisibleNotificationCount } from './Footer/useAllNotifications';
import { Text } from './ScaledText';

/**
 * Width reserved at the trailing edge for the floating SOS button.
 *
 * No tab may sit under it: SOS fires on a one-second hold, and a tab hidden
 * beneath it would be a target the user can see the label of but never
 * reliably hit.
 */
const SOS_RESERVE = 84;

type TabKey = 'home' | 'modules' | 'alerts';

type TabDefinition = {
  key: TabKey;
  label: string;
  icon: string;
  /** Route this tab selects. Alerts opens a sheet instead, so it has none. */
  route?: string;
};

const TABS: TabDefinition[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: 'Home' },
  { key: 'modules', label: 'Modules', icon: 'grid-outline', route: 'Modules' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications-outline' },
];

const MODULE_ROUTES = new Set([
  'Modules',
  'CoreModule',
  'NavigationModule',
  'ReferenceModule',
  'CommunicationsModule',
  'PrepperModule',
  'EarthModule',
  'MapScreen',
  'StarMap',
  'GridReference',
  'DownloadArea',
  'MapSpike',
  'ComingSoon',
  'MorseCode',
  'AlphaToMorse',
  'MorseToAlpha',
  'MorseCodeCheatSheet',
  'MorseTrainer',
  'MorseTrainerLevel',
  'NatoPhonetic',
  'RadioFrequencies',
  'RadioFrequencyDetail',
  'RepeaterBook',
  'RepeaterDetail',
  'AddCustomRepeater',
  'DecibelMeter',
  'DigitalWhistle',
  'GroundToAirSignals',
  'DeviceStatus',
  'Flashlight',
  'Nightvision',
  'VoiceLog',
  'NewNote',
  'EditNote',
  'Notepad',
  'NoteCategory',
  'NoteEntry',
  'RecentNotes',
  'BookmarkedNotes',
  'ManageCategories',
  'Checklist',
  'ChecklistEntry',
  'SunTime',
  'LunarCycles',
  'BarometricPressure',
  'SeasonalOutlook',
  'SkyEvents',
  'UnitConversion',
  'ConversionCategory',
  'Inventory',
  'InventoryCategory',
  'InventoryAllItems',
  'ManageInventoryCategories',
  'NewInventoryItem',
  'EditInventoryItem',
  'Pantry',
  'PantryCategory',
  'PantryAllItems',
  'PantryExpirationTracker',
  'ManagePantryCategories',
  'NewPantryItem',
  'EditPantryItem',
  'DepletionCalculator',
  'BarterEstimator',
  'Bookmark',
  'Category',
  'Entry',
  'Health',
  'Survival',
  'Weather',
  'ToolsAndKnots',
  'Emergency',
  'ScenarioCards',
  'ScenarioCategory',
  'ScenarioDetail',
  'ScenarioBookmarks',
  'EmergencyPlan',
  'EmergencyContacts',
  'NewEmergencyContact',
  'EditEmergencyContact',
  'RallyPoints',
  'NewRallyPoint',
  'EditRallyPoint',
  'CommunicationPlan',
]);

type Props = {
  /** Opens the alerts sheet. Owned by the host so the sheet outlives tab changes. */
  onAlertsPress: () => void;
  /** Whether the alerts sheet is currently open. */
  alertsActive: boolean;
};

/**
 * The app's bottom tab bar.
 *
 * Replaces the old three-zone footer, which split into 50% notifications /
 * 25% active tool / 25% SOS — unequal zones in mismatched shapes. This is a
 * standard tab bar: equal targets, icon over label, one active tint.
 *
 * The design asks for a blurred bar. `@react-native-community/blur` is not a
 * dependency of this offline-first app, and the handoff explicitly allows the
 * flat fallback, so the bar is painted at full opacity instead. Swapping in a
 * `BlurView` behind `styles.bar` is the only change that would be needed.
 */
const TabBar = observer(({ onAlertsPress, alertsActive }: Props) => {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const notificationCount = useVisibleNotificationCount();

  // The active route comes from the container ref rather than
  // `useNavigationState`. The tab bar is rendered by AppShell, which wraps the
  // navigator instead of sitting inside it — `useNavigationState` requires a
  // navigator above it and throws here, while the container ref is reachable
  // from anywhere under NavigationContainer.
  const [activeRoute, setActiveRoute] = useState<string | undefined>(() =>
    navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined,
  );

  useEffect(() => {
    const syncActiveRoute = () => {
      setActiveRoute(
        navigationRef.isReady()
          ? navigationRef.getCurrentRoute()?.name
          : undefined,
      );
    };

    // The container may not be ready on the first render; sync once now to
    // catch the case where it already is.
    syncActiveRoute();
    return navigationRef.addListener('state', syncActiveRoute);
  }, []);

  const activeKey: TabKey | undefined = alertsActive
    ? 'alerts'
    : activeRoute === 'Home'
      ? 'home'
      : activeRoute && MODULE_ROUTES.has(activeRoute)
        ? 'modules'
        : undefined;

  const handlePress = (tab: TabDefinition) => {
    if (tab.key === 'alerts') {
      onAlertsPress();
      return;
    }
    if (tab.route) {
      navigation.navigate(tab.route);
    }
  };

  return (
    <View
      style={[
        styles.bar,
        {
          height: FOOTER_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: COLORS.SURFACE,
          borderTopColor: withAlpha(COLORS.BRAND, 0.2),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeKey === tab.key;
        const tint = isActive ? COLORS.BRAND : COLORS.MUTED;
        const showBadge = tab.key === 'alerts' && notificationCount > 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => handlePress(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={
              showBadge
                ? `${tab.label}, ${notificationCount} notification${
                    notificationCount === 1 ? '' : 's'
                  }`
                : tab.label
            }
            android_ripple={{
              color: withAlpha(COLORS.BRAND, 0.12),
              borderless: true,
            }}
            style={({ pressed }) => [
              styles.tab,
              Platform.OS === 'ios' && pressed && styles.pressed,
            ]}
          >
            <View>
              <Ionicons name={tab.icon} size={25} color={tint} />
              {showBadge ? (
                <View
                  style={[styles.badge, { backgroundColor: COLORS.ACCENT }]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: onColor(COLORS.ACCENT) },
                    ]}
                  >
                    {notificationCount > 99 ? '99+' : String(notificationCount)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
                { color: tint },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}

      {/* Keeps the trailing tab clear of the floating SOS button. */}
      <View style={styles.sosReserve} />
    </View>
  );
});

export default TabBar;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    justifyContent: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 10.5,
  },
  labelActive: {
    // The design specifies weight 590, which RN does not accept.
    fontWeight: '600',
  },
  labelInactive: {
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -2,
    left: 14,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  sosReserve: {
    width: SOS_RESERVE,
  },
});
