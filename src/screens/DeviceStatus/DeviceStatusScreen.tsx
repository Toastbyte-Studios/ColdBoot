import { observer } from 'mobx-react-lite';
import React from 'react';
import StackScreen from '../../components/StackScreen';
import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import BatterySection from './components/BatterySection';
import LocationSection from './components/LocationSection';
import StatusRow from './components/StatusRow';
import StatusSection from './components/StatusSection';

/**
 * DeviceStatusScreen
 *
 * What the phone can do for you right now, off-grid: where it thinks you are
 * and how far to trust that, how long the battery will last, what it is
 * connected to, and how much room is left.
 *
 * Each section is a grouped list of readouts (`StatusRow`), the same shape as
 * Sun Times' event list. Rows that have a judgement to make (a weak fix, low
 * battery) carry a coloured dot; plain facts don't.
 *
 * @returns A React element containing the Device Status screen UI.
 */
function DeviceStatusScreen() {
  const { storageText, offlineText } = useDeviceStatus();

  return (
    <StackScreen title="Device Status">
      <LocationSection />

      <BatterySection />

      <StatusSection title="Connectivity">
        <StatusRow label="Network" value={offlineText} isLast />
      </StatusSection>

      <StatusSection title="Storage">
        <StatusRow label="Used" value={storageText} isLast />
      </StatusSection>
    </StackScreen>
  );
}

export default observer(DeviceStatusScreen);
