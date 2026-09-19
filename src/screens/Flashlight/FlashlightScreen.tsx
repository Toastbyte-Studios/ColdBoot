import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FlashlightModes } from '../../../constants';
import AppSwitch from '../../components/AppSwitch';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useSignalingStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { FlashlightModeType } from '../../types/common-types';

const isAndroid = Platform.OS === 'android';

/**
 * Flashlight screen implementation that lets the user select a flashlight mode and adjust
 * mode-specific settings.
 *
 * @remarks
 * - Reads the current mode and settings from the signaling store.
 * - Updates flashlight mode via `core.setFlashlightMode`.
 * - Provides navigation to the Nightvision screen.
 * - Conditionally renders:
 *   - **Strobe controls**: frequency slider (1–15 Hz) bound to `core.strobeFrequencyHz` and `core.setStrobeFrequency`.
 *   - **SOS controls**: tone toggle switch bound to `core.sosWithTone` and `core.setSosWithTone`.
 * - Marks the active mode with an "On" value on its row, and names it in the
 *   header subtitle.
 *
 * @returns A React element rendering the flashlight mode list and any applicable controls.
 */
const FlashlightScreenImpl = () => {
  const COLORS = useTheme();
  const core = useSignalingStore();
  const navigation = useNavigation();
  const mode = core.flashlightMode;

  const selectMode = (next: FlashlightModeType[keyof FlashlightModeType]) => {
    core.setFlashlightMode(next);
  };

  const openNightvision = () => {
    // @ts-ignore - navigation types
    navigation.navigate('Nightvision');
  };

  const activeLabel =
    mode === FlashlightModes.ON
      ? 'Light on'
      : mode === FlashlightModes.SOS
        ? 'SOS signalling'
        : mode === FlashlightModes.STROBE
          ? `Strobe at ${core.strobeFrequencyHz} Hz`
          : 'Off';

  return (
    <StackScreen title="Flashlight" subtitle={activeLabel}>
      <GroupContainer>
        <ModuleRow
          title="Flashlight On"
          icon="flashlight-outline"
          variant="tool"
          value={mode === FlashlightModes.ON ? 'On' : 'Off'}
          onPress={() => selectMode(FlashlightModes.ON)}
        />
        <ModuleRow
          title="SOS"
          icon="alert-outline"
          variant="tool"
          value={mode === FlashlightModes.SOS ? 'On' : 'Off'}
          onPress={() => selectMode(FlashlightModes.SOS)}
        />
        <ModuleRow
          title="Strobe"
          icon="flash-outline"
          variant="tool"
          value={mode === FlashlightModes.STROBE ? 'On' : 'Off'}
          onPress={() => selectMode(FlashlightModes.STROBE)}
        />
        <ModuleRow
          title="Nightvision"
          icon="moon-outline"
          variant="tool"
          showSeparator={false}
          onPress={openNightvision}
        />
      </GroupContainer>

      {mode === FlashlightModes.STROBE && (
        <View style={styles.controls}>
          <SectionEyebrow>Strobe frequency</SectionEyebrow>
          <View style={[styles.card, cardSurface(COLORS)]}>
            <Text style={styles.value}>{core.strobeFrequencyHz} Hz</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={15}
              step={1}
              value={core.strobeFrequencyHz}
              onValueChange={(v: number) => core.setStrobeFrequency(v)}
              minimumTrackTintColor={COLORS.ACCENT}
              maximumTrackTintColor={COLORS.SECONDARY_ACCENT}
              accessibilityLabel="Strobe frequency in hertz"
            />
          </View>
        </View>
      )}

      {mode === FlashlightModes.SOS && (
        <View style={styles.controls}>
          <SectionEyebrow>SOS</SectionEyebrow>
          <View style={[styles.card, styles.switchRow, cardSurface(COLORS)]}>
            <Text style={styles.switchLabel}>Play a tone with the flash</Text>
            <AppSwitch
              value={core.sosWithTone}
              onValueChange={(v: boolean) => core.setSosWithTone(v)}
              tint={COLORS.ACCENT}
              offTint={COLORS.SECONDARY_ACCENT}
              thumbColor={
                core.sosWithTone ? COLORS.PRIMARY_LIGHT : COLORS.BRAND
              }
              accessibilityLabel="Play a tone alongside the SOS flash"
            />
          </View>
        </View>
      )}
    </StackScreen>
  );
};

export default observer(FlashlightScreenImpl);

const styles = StyleSheet.create({
  controls: {
    marginTop: SPACING.lg,
  },
  card: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.lg,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
  },
});
