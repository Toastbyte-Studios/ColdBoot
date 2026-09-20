import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';

const isAndroid = Platform.OS === 'android';

/**
 * DeviceStatusScreen
 *
 * Displays a summary of the device’s current health/status metrics in a simple
 * card-based UI.
 *
 * The screen renders:
 * - Battery status text
 * - Time/description of the last GPS fix
 * - Storage usage/availability
 * - Connectivity/offline status
 *
 * Data is sourced from {@link useDeviceStatus}, which provides pre-formatted
 * strings for display. Each metric is presented on the shared card surface
 * (see `cardSurface`) with consistent label/value typography. The cards are
 * status readouts, not controls, which is why they are cards rather than the
 * tappable rows the rest of the redesign's lists use.
 *
 * @returns A React element containing the Device Status screen UI.
 */
function DeviceStatusScreen() {
  const COLORS = useTheme();
  const { storageText, batteryText, lastFixText, offlineText } =
    useDeviceStatus();

  const metrics = [
    { label: 'Battery', value: batteryText },
    { label: 'Last GPS fix', value: lastFixText },
    { label: 'Storage', value: storageText },
    { label: 'Connectivity', value: offlineText },
  ];

  return (
    <StackScreen title="Device Status">
      <SectionEyebrow>Device metrics</SectionEyebrow>
      {metrics.map((metric) => (
        <View
          key={metric.label}
          style={[styles.card, cardSurface(COLORS)]}
          accessible
          accessibilityLabel={`${metric.label}. ${metric.value}`}
        >
          <Text style={[styles.label, { color: COLORS.MUTED }]}>
            {metric.label}
          </Text>
          <Text style={styles.value}>{metric.value}</Text>
        </View>
      ))}
    </StackScreen>
  );
}

export default observer(DeviceStatusScreen);

const styles = StyleSheet.create({
  card: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: 16,
  },
});
