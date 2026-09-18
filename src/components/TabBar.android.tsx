import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from '../navigation/navigationRef';
import { FOOTER_HEIGHT } from '../theme';
import { onColor } from '../theme/colorUtils';
import { useVisibleNotificationCount } from './Footer/useAllNotifications';
import { Text } from './ScaledText';

type TabKey = 'home' | 'modules' | 'alerts';

type TabDefinition = {
  key: TabKey;
  label: string;
  icon: string;
  /** Route this destination selects. Alerts opens a sheet instead, so it has none. */
  route?: string;
};

const TABS: TabDefinition[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: 'Home' },
  { key: 'modules', label: 'Modules', icon: 'grid-outline', route: 'Modules' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications-outline' },
];

/** The active indicator: a 64×32dp pill behind the selected destination's icon. */
const PILL = { width: 64, height: 32 };

/** M3 `emphasized` easing, as a cubic-bezier RN can build. */
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
const PILL_DURATION_MS = 150;

type Props = {
  /** Opens the alerts sheet. Owned by the host so the sheet outlives tab changes. */
  onAlertsPress: () => void;
  /** Closes the alerts sheet when another destination is selected. */
  onAlertsClose: () => void;
  /** Whether the alerts sheet is currently open. */
  alertsActive: boolean;
};

/**
 * The Material 3 navigation bar.
 *
 * One structural difference from the iOS tab bar, beyond the obvious paint:
 *
 * - **The pill, not a tint.** Material marks the active destination with a
 *   tonal indicator behind its icon and leaves the label alone; iOS tints both
 *   and draws nothing. The pill grows in rather than sliding, because the
 *   destinations are not a continuum.
 *
 * The bar is opaque. Material does not blur this surface, and the app is
 * offline-first, so nothing is gained by pretending there is depth here.
 */
const TabBar = observer(
  ({ onAlertsPress, onAlertsClose, alertsActive }: Props) => {
    const COLORS = useTheme();
    const insets = useSafeAreaInsets();
    const rippleColor = useRippleColor();
    const navigation = useNavigation<{ navigate: (route: string) => void }>();
    const notificationCount = useVisibleNotificationCount();

    // The active route comes from the container ref rather than
    // `useNavigationState`. The bar is rendered by AppShell, which wraps the
    // navigator instead of sitting inside it — `useNavigationState` requires a
    // navigator above it and throws here, while the container ref is reachable
    // from anywhere under NavigationContainer.
    const [routeStack, setRouteStack] = useState<string[]>(() =>
      navigationRef.isReady()
        ? (navigationRef.getRootState()?.routes.map((route) => route.name) ??
          [])
        : [],
    );

    useEffect(() => {
      const syncRouteStack = () => {
        if (!navigationRef.isReady()) {
          setRouteStack([]);
          return;
        }
        setRouteStack(
          navigationRef.getRootState()?.routes.map((route) => route.name) ?? [],
        );
      };

      // The container may not be ready on the first render; sync once now to
      // catch the case where it already is.
      syncRouteStack();
      return navigationRef.addListener('state', syncRouteStack);
    }, []);

    const lastTabRoute = [...routeStack]
      .reverse()
      .find((route) => route === 'Home' || route === 'Modules');
    const activeKey: TabKey | undefined = alertsActive
      ? 'alerts'
      : lastTabRoute === 'Home'
        ? 'home'
        : lastTabRoute === 'Modules'
          ? 'modules'
          : undefined;

    const handlePress = (tab: TabDefinition) => {
      if (tab.key === 'alerts') {
        onAlertsPress();
        return;
      }
      onAlertsClose();
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
            backgroundColor: COLORS.SURFACE_CONTAINER_HIGH,
          },
        ]}
      >
        {TABS.map((tab) => (
          <Destination
            key={tab.key}
            tab={tab}
            isActive={activeKey === tab.key}
            notificationCount={notificationCount}
            rippleColor={rippleColor}
            onPress={() => handlePress(tab)}
          />
        ))}
      </View>
    );
  },
);

function Destination({
  tab,
  isActive,
  notificationCount,
  rippleColor,
  onPress,
}: {
  tab: TabDefinition;
  isActive: boolean;
  notificationCount: number;
  rippleColor: string;
  onPress: () => void;
}) {
  const COLORS = useTheme();
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  // The bar is rendered with its destination already selected; only a later
  // change is a transition.
  const isMounting = useRef(true);

  useEffect(() => {
    if (isMounting.current) {
      isMounting.current = false;
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: PILL_DURATION_MS,
      easing: EMPHASIZED,
      // Animates width, which the native driver cannot drive.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isActive, progress]);

  const pillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [PILL.height, PILL.width],
  });

  const tint = isActive ? COLORS.ON_SECONDARY_CONTAINER : COLORS.MUTED;
  const showBadge = tab.key === 'alerts' && notificationCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={
        showBadge
          ? `${tab.label}, ${notificationCount} notification${
              notificationCount === 1 ? '' : 's'
            }`
          : tab.label
      }
      android_ripple={{ color: rippleColor, borderless: true }}
      style={styles.destination}
    >
      <View style={styles.iconCell}>
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              opacity: progress,
              backgroundColor: COLORS.SECONDARY_CONTAINER,
            },
          ]}
        />
        <Ionicons name={tab.icon} size={24} color={tint} />
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: COLORS.ACCENT }]}>
            <Text style={[styles.badgeText, { color: onColor(COLORS.ACCENT) }]}>
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
}

export default TabBar;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 12,
  },
  destination: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-start',
  },
  iconCell: {
    width: PILL.width,
    height: PILL.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    height: PILL.height,
    borderRadius: PILL.height / 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 14,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
  },
  labelActive: {
    fontWeight: '600',
  },
  labelInactive: {
    fontWeight: '500',
  },
});
