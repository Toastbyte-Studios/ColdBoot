import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { FlashlightModes } from '../../../constants';
import AppButton from '../../components/AppButton';
import ModuleHero from '../../components/ModuleHero';
import radioFrequencies from '../../data/radioFrequencies.json';
import {
  useCoreStore,
  useRepeaterBookStore,
  useSettingsStore,
  useSignalingStore,
} from '../../stores/StoreContext';
import {
  channelText,
  emergencyChannel,
  nearestRepeater,
  repeaterText,
} from './commsHero';

const SERVICES = Object.values(radioFrequencies.frequencies);
const EMERGENCY = emergencyChannel(SERVICES);

/**
 * Comms' hero is an action rather than a reading: signal for help. One tap
 * starts the flashlight's SOS pattern (and the running-tool card shows it,
 * with a switch to stop it); the whistle opens the Digital Whistle. Below:
 * the nearest repeater, the channel to try first, and the "three of
 * anything" rule that makes any signal a distress call.
 */
const CommsHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const signaling = useSignalingStore();
  const repeaters = useRepeaterBookStore();
  const core = useCoreStore();
  const settings = useSettingsStore();

  // Read the cached list only: the hero must not trigger a network fetch.
  useEffect(() => {
    if (repeaters.repeaters.length === 0) {
      repeaters.loadFromCache().catch(() => {});
    }
    if (repeaters.customRepeaters.length === 0) {
      repeaters.loadCustomRepeaters().catch(() => {});
    }
  }, [repeaters]);

  const sosOn = signaling.flashlightMode === FlashlightModes.SOS;
  const fix = core.lastFix?.coords ?? null;
  const nearest = nearestRepeater(
    [...repeaters.repeaters, ...repeaters.customRepeaters],
    fix ? { latitude: fix.latitude, longitude: fix.longitude } : null,
  );

  return (
    <ModuleHero
      eyebrow="Distress signal"
      headline={sosOn ? 'SOS is flashing' : 'Signal for help'}
      headlineTone={sosOn ? 'poor' : undefined}
      detail={
        sosOn
          ? 'Point the light toward rescuers. Stop it here or from the card below.'
          : 'Flash SOS with the light, or sound the whistle.'
      }
      actions={
        <>
          <AppButton
            label={sosOn ? 'Stop SOS' : 'SOS light'}
            icon="flashlight-outline"
            variant={sosOn ? 'outlined' : 'destructive'}
            onPress={() =>
              signaling.setFlashlightMode(
                sosOn ? FlashlightModes.OFF : FlashlightModes.SOS,
              )
            }
            accessibilityLabel={
              sosOn ? 'Stop the SOS light' : 'Start flashing SOS with the light'
            }
          />
          <AppButton
            label="Whistle"
            icon="megaphone-outline"
            variant="tinted"
            onPress={() => navigation.navigate('DigitalWhistle')}
            accessibilityLabel="Open the digital whistle"
          />
        </>
      }
      stats={[
        nearest
          ? {
              label: 'Repeater',
              value: repeaterText(nearest, settings.measurementSystem),
              onPress: () => navigation.navigate('RepeaterBook'),
            }
          : {
              label: 'Repeater',
              value: 'None saved',
              tone: 'muted',
              onPress: () => navigation.navigate('RepeaterBook'),
            },
        EMERGENCY
          ? {
              label: 'Try first',
              value: channelText(EMERGENCY.service, EMERGENCY.channel),
              onPress: () =>
                navigation.navigate('RadioFrequencyDetail', {
                  frequencyData: EMERGENCY.service,
                }),
            }
          : {
              label: 'Try first',
              value: '—',
              tone: 'muted',
            },
        {
          label: 'Help signal',
          value: 'Three of anything',
          accessibilityLabel:
            'Help signal: three of anything. Three whistle blasts, flashes or fires.',
          onPress: () => navigation.navigate('GroundToAirSignals'),
        },
      ]}
    />
  );
});

export default CommsHero;
