import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../constants';
import { useTheme } from '../hooks/useTheme';
import { useSignalingStore } from '../stores/StoreContext';
import { RADIUS, SPACING } from '../theme';
import { onColor } from '../theme/colorUtils';
import { formatElapsed } from '../utils/sunTimes';
import { Text } from './ScaledText';

type ActiveTool = {
  icon: string;
  label: string;
  /** Route the card opens. Omitted when the tool has no screen of its own. */
  screen?: string;
  kind: 'flashlight' | 'decibel';
};

/** The running tool, or `null` when nothing is. Decibel metering wins ties. */
function resolveActiveTool(core: {
  decibelMeterActive: boolean;
  // `NIGHTVISION` is optional on FlashlightModeType, so the indexed mode type
  // includes `undefined`.
  flashlightMode: string | undefined;
}): ActiveTool | null {
  if (core.decibelMeterActive) {
    return {
      icon: 'volume-high-outline',
      label: 'Decibel meter',
      screen: 'DecibelMeter',
      kind: 'decibel',
    };
  }

  switch (core.flashlightMode) {
    case FlashlightModes.ON:
      return {
        icon: 'flashlight-outline',
        label: 'Flashlight',
        screen: 'Flashlight',
        kind: 'flashlight',
      };
    case FlashlightModes.STROBE:
      return {
        icon: 'flash-outline',
        label: 'Flashlight · strobe',
        screen: 'Flashlight',
        kind: 'flashlight',
      };
    case FlashlightModes.SOS:
      return {
        icon: 'alert-outline',
        label: 'Flashlight · SOS',
        screen: 'Flashlight',
        kind: 'flashlight',
      };
    case FlashlightModes.NIGHTVISION:
      return {
        icon: 'moon-outline',
        label: 'Nightvision',
        screen: 'Nightvision',
        kind: 'flashlight',
      };
    default:
      return null;
  }
}

/**
 * Shows the tool that is currently running, with how long it has been going
 * and a switch to stop it.
 *
 * This replaces the footer's `ActiveItemButton`, which was a bare icon in a
 * quarter-width slot: it showed *that* something was running but never what,
 * or for how long. Running a torch for an unknown length of time is exactly
 * the thing a survival app should not be vague about, so the card names the
 * tool and counts the battery it is costing.
 *
 * Renders nothing when no tool is active.
 */
const ActiveToolCard = observer(() => {
  const core = useSignalingStore();
  const COLORS = useTheme();
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const activeTool = resolveActiveTool(core);
  const activeToolKind = activeTool?.kind;
  const [now, setNow] = useState(() => Date.now());

  // Tick only while something is running; an idle screen schedules no timer.
  useEffect(() => {
    if (!activeToolKind) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeToolKind]);

  if (!activeTool) {
    return null;
  }

  const activeSince = core.getActiveSince(activeTool.kind);
  const elapsed = activeSince ? formatElapsed(now - activeSince) : null;
  const status = elapsed ? `Running · ${elapsed}` : 'Running';

  const stop = () => {
    if (activeTool.kind === 'decibel') {
      core.setDecibelMeterActive(false);
    } else {
      core.setFlashlightMode(FlashlightModes.OFF);
    }
  };

  return (
    <Pressable
      onPress={() =>
        activeTool.screen && navigation.navigate(activeTool.screen)
      }
      accessibilityRole="button"
      accessibilityLabel={`${activeTool.label}. ${status}. Opens the tool.`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: COLORS.SURFACE, borderColor: COLORS.BORDER },
        Platform.OS === 'ios' && pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.tile, { backgroundColor: COLORS.ACCENT }]}
        accessible={false}
      >
        <Ionicons
          name={activeTool.icon}
          size={20}
          color={onColor(COLORS.ACCENT)}
        />
      </View>

      <View style={styles.labels} accessible={false}>
        <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
          {activeTool.label}
        </Text>
        <Text style={[styles.status, { color: COLORS.ACCENT }]}>{status}</Text>
      </View>

      <Switch
        value
        onValueChange={stop}
        trackColor={{ true: COLORS.ACCENT }}
        accessibilityLabel={`Stop ${activeTool.label}`}
      />
    </Pressable>
  );
});

export default ActiveToolCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.group,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: SPACING.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 12.5,
    fontWeight: '400',
  },
});
