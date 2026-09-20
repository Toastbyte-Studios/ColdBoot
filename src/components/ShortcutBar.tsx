import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../constants';
import { useVisibleNotificationCount } from '../hooks/useAllNotifications';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from '../navigation/navigationRef';
import { useSettingsStore, useSignalingStore } from '../stores';
import { DEFAULT_SHORTCUTS, resolveShortcutIds } from '../stores/SettingsStore';
import { FOOTER_HEIGHT } from '../theme';
import { onColor, withAlpha } from '../theme/colorUtils';
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

type Props = {
  onAlertsPress: () => void;
  onAlertsClose: () => void;
  alertsActive: boolean;
};

const ShortcutBar = observer(
  ({ onAlertsPress, onAlertsClose, alertsActive }: Props) => {
    const COLORS = useTheme();
    const insets = useSafeAreaInsets();
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
            backgroundColor: COLORS.SURFACE,
            borderTopColor: withAlpha(COLORS.BRAND, 0.2),
          },
        ]}
      >
        {items.map((item) => {
          const isFlashlight = item.toolId === 'core_flashlight';
          const isAlerts = item.key === 'alerts';
          const isActive = activeKey === item.key;
          const tint = isActive ? COLORS.BRAND : COLORS.MUTED;

          return (
            <ShortcutButton
              key={item.key}
              label={item.label}
              icon={item.icon}
              isAlerts={isAlerts}
              isActive={isActive}
              tint={tint}
              notificationCount={notificationCount}
              onPress={() => handlePress(item)}
              onLongPress={isFlashlight ? toggleFlashlight : undefined}
              badgeColor={COLORS.ACCENT}
              accessibilityHint={
                isFlashlight
                  ? 'Double tap and hold to toggle the light without opening Flashlight.'
                  : undefined
              }
            />
          );
        })}
      </View>
    );
  },
);

function ShortcutButton({
  label,
  icon,
  isAlerts,
  isActive,
  tint,
  notificationCount,
  onPress,
  onLongPress,
  badgeColor,
  accessibilityHint,
}: {
  label: string;
  icon: string;
  isAlerts: boolean;
  isActive: boolean;
  tint: string;
  notificationCount: number;
  onPress: () => void;
  onLongPress?: () => void;
  badgeColor: string;
  accessibilityHint?: string;
}) {
  const skipNextPress = useRef(false);
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
      accessibilityHint={accessibilityHint}
      accessibilityActions={
        onLongPress ? [{ name: 'longpress', label: 'Toggle light' }] : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') {
          onLongPress?.();
        }
      }}
      android_ripple={{
        color: withAlpha(tint, 0.12),
        borderless: true,
      }}
      style={({ pressed }) => [
        styles.tab,
        Platform.OS === 'ios' && pressed && styles.pressed,
      ]}
    >
      <View>
        <Ionicons name={icon} size={25} color={tint} />
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: onColor(badgeColor) }]}>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 10.5,
  },
  labelActive: {
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
});
