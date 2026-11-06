import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { magnetometer } from 'react-native-sensors';
import {
  useBarometerStore,
  useSettingsStore,
} from '../../../stores/StoreContext';
import { displayPressure } from '../../../utils/unitConversions';
import { probeSensor, SensorPresence } from '../sensorProbe';
import StatusRow from './StatusRow';
import StatusSection from './StatusSection';

const PRESENCE_TEXT: Record<SensorPresence | 'checking', string> = {
  present: 'Working',
  absent: 'Not on this device',
  unknown: 'No reading',
  checking: 'Checking…',
};

/**
 * Sensors that ColdBoot tools depend on, and which tools those are, so a
 * missing one explains a tool that doesn't work rather than looking like a
 * bug. Missing hardware is a fact about the phone, not a fault, so it gets
 * a grey dot rather than a red one.
 */
const SensorsSection = observer(() => {
  const barometer = useBarometerStore();
  const settings = useSettingsStore();
  const [compass, setCompass] = useState<SensorPresence | 'checking'>(
    'checking',
  );

  useEffect(() => {
    let cancelled = false;
    probeSensor(magnetometer).then((presence) => {
      if (!cancelled) setCompass(presence);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The barometer store subscribes at startup and records whether it worked.
  const barometerPresence: SensorPresence | 'checking' = !barometer.available
    ? 'absent'
    : barometer.currentPressure != null
      ? 'present'
      : barometer.loading
        ? 'checking'
        : 'unknown';

  return (
    <StatusSection title="Sensors">
      <StatusRow
        label="Barometer"
        value={
          barometerPresence === 'present' && barometer.currentPressure != null
            ? displayPressure(
                barometer.currentPressure,
                settings.measurementSystem,
              )
            : PRESENCE_TEXT[barometerPresence]
        }
        detail="Used by Barometric Pressure"
        tone={barometerPresence === 'present' ? 'good' : 'neutral'}
      />
      <StatusRow
        label="Compass"
        value={PRESENCE_TEXT[compass]}
        detail="Used by the Map's heading"
        tone={compass === 'present' ? 'good' : 'neutral'}
        isLast
      />
    </StatusSection>
  );
});

export default SensorsSection;
