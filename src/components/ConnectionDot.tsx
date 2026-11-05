import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCoreStore } from '../stores/StoreContext';

export type ConnectionState = 'online' | 'offline' | 'unknown';

const LABELS: Record<ConnectionState, string> = {
  online: 'Connected',
  offline: 'Not connected',
  unknown: 'Connection status unknown',
};

type ConnectionDotProps = {
  /** Diameter in points. */
  size?: number;
};

/**
 * A small status dot beside the date: green when the device has a network
 * connection, red when it doesn't. ColdBoot works the same either way; the dot
 * only tells the user what the device can reach.
 *
 * Grey covers the moment before NetInfo reports its first state, so the dot
 * never claims a connection it hasn't seen.
 */
const ConnectionDot = observer(({ size = 8 }: ConnectionDotProps) => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const state = connectionState(core.netInfo?.isConnected);

  const color = {
    online: COLORS.SUCCESS,
    offline: COLORS.ERROR,
    unknown: COLORS.MUTED,
  }[state];

  return (
    <View
      testID="connection-dot"
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABELS[state]}
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
});

/** Maps NetInfo's `isConnected` (which is null until known) to a dot state. */
export function connectionState(
  isConnected: boolean | null | undefined,
): ConnectionState {
  if (isConnected == null) return 'unknown';
  return isConnected ? 'online' : 'offline';
}

export default ConnectionDot;

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
