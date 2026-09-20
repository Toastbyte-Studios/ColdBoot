import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../constants';
import { useVisibleNotificationCount } from '../hooks/useAllNotifications';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from '../navigation/navigationRef';
import { useSettingsStore, useSignalingStore } from '../stores';
import { DEFAULT_SHORTCUTS, resolveShortcutIds } from '../stores/SettingsStore';
import { FOOTER_HEIGHT } from '../theme';
import { onColor } from '../theme/colorUtils';
import { getToolById } from '../utils/tools';
import { Text } from './ScaledText';

type ShortcutKey = 'shortcut-0' | 'shortcut-1' | 'shortcut-2' | 'alerts';

type ShortcutDefinition = {
  key: ShortcutKey;
  label: string;
  icon: string;
  route?: string;
  toolId?: string;
};

const SHORTCUT_KEYS: Array<Exclude<ShortcutKey, 'alerts'>> = [
  'shortcut-0',
  'shortcut-1',
  'shortcut-2',
];

const PILL = { width: 64, height: 32 };
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
const PILL_DURATION_MS = 150;

type Props = {
  onAlertsPress: () => void;
  onAlertsClose: () => void;
  alertsActive: boolean;
};

const ShortcutBar = observer(
  ({ onAlertsPress, onAlertsClose, alertsActive }: Props) => {
    const COLORS = useTheme();
    const insets = useSafeAreaInsets();
    const rippleColor = useRippleColor();
    const navigation = useNavigation<{ navigate: (route: string) => void }>();
    const notificationCount = useVisibleNotificationCount();
    const settingsStore = useSettingsStore();
    const signalingStore = useSignalingStore();
    const [currentRoute, setCurrentRoute] = useState<string | undefined>(() =>
      navigationRef.isReady()
        ? navigationRef.getCurrentRoute()?.name
        : undefined,
    );

    useEffect(() => {
      const syncCurrentRoute = () => {
        setCurrentRoute(
          navigationRef.isReady()
            ? navigationRef.getCurrentRoute()?.name
            : undefined,
        );
      };

      syncCurrentRoute();
      return navigationRef.addListener('state', syncCurrentRoute);
    }, []);

    const shortcuts = resolveShortcutIds(settingsStore.shortcuts).map(
      (toolId, index) => {
        const tool =
          getToolById(toolId) ??
          getToolById(DEFAULT_SHORTCUTS[index]) ??
          getToolById(DEFAULT_SHORTCUTS[0]);

        if (!tool) {
          return {
            key: SHORTCUT_KEYS[index],
            label: 'Shortcut',
            icon: 'construct-outline',
          };
        }

        return {
          key: SHORTCUT_KEYS[index],
          label: tool.shortName ?? tool.name,
          icon: tool.icon,
          route: tool.screen,
          toolId: tool.id,
        };
      },
    );

    const items: ShortcutDefinition[] = [
      ...shortcuts,
      {
        key: 'alerts',
        label: 'Alerts',
        icon: 'notifications-outline',
      },
    ];

    const activeKey: ShortcutKey | undefined = alertsActive
      ? 'alerts'
      : items.find((item) => item.route === currentRoute)?.key;

    const toggleFlashlight = () => {
      signalingStore.setFlashlightMode(
        signalingStore.flashlightMode === FlashlightModes.OFF
          ? FlashlightModes.ON
          : FlashlightModes.OFF,
      );
    };

    const handlePress = (item: ShortcutDefinition) => {
      if (item.key === 'alerts') {
        onAlertsPress();
        return;
      }

      onAlertsClose();
      if (item.route) {
        navigation.navigate(item.route);
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
        {items.map((item) => (
          <Destination
            key={item.key}
            icon={item.icon}
            isAlerts={item.key === 'alerts'}
            isActive={activeKey === item.key}
            label={item.label}
            notificationCount={notificationCount}
            onPress={() => handlePress(item)}
            onLongPress={
              item.toolId === 'core_flashlight' ? toggleFlashlight : undefined
            }
            rippleColor={rippleColor}
          />
        ))}
      </View>
    );
  },
);

function Destination({
  icon,
  isAlerts,
  isActive,
  label,
  notificationCount,
  onPress,
  onLongPress,
  rippleColor,
}: {
  icon: string;
  isAlerts: boolean;
  isActive: boolean;
  label: string;
  notificationCount: number;
  onPress: () => void;
  onLongPress?: () => void;
  rippleColor: string;
}) {
  const COLORS = useTheme();
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const isMounting = useRef(true);
  const skipNextPress = useRef(false);

  useEffect(() => {
    if (isMounting.current) {
      isMounting.current = false;
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: PILL_DURATION_MS,
      easing: EMPHASIZED,
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
  const showBadge = isAlerts && notificationCount > 0;

  return (
    <Pressable
      onPress={() => {
        if (skipNextPress.current) {
          skipNextPress.current = false;
          return;
        }
        onPress();
      }}
      onLongPress={
        onLongPress
          ? () => {
              skipNextPress.current = true;
              onLongPress();
            }
          : undefined
      }
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={
        showBadge
          ? `${label}, ${notificationCount} notification${
              notificationCount === 1 ? '' : 's'
            }`
          : label
      }
      accessibilityHint={
        onLongPress
          ? 'Double tap and hold to toggle the light without opening Flashlight.'
          : undefined
      }
      accessibilityActions={
        onLongPress ? [{ name: 'longpress', label: 'Toggle light' }] : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') {
          onLongPress?.();
        }
      }}
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
        <Ionicons name={icon} size={24} color={tint} />
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: COLORS.ACCENT }]}>
            <Text style={[styles.badgeText, { color: onColor(COLORS.ACCENT) }]}>
              {notificationCount > 99 ? '99+' : String(notificationCount)}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          isActive ? styles.labelActive : styles.labelInactive,
          { color: tint },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default ShortcutBar;

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
    minWidth: 0,
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
