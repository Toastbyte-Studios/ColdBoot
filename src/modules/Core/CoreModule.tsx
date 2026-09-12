import { observer } from 'mobx-react-lite';
import React from 'react';
import { CORE_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';
import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import { useNotesStore } from '../../stores/StoreContext';

/**
 * The Core module: the tools that work with nothing but the device itself.
 *
 * Two rows carry live values, because a number the app already knows is worth
 * more on the list than behind a tap — battery level in particular, which is
 * the constraint every other tool here spends.
 */
const CoreModule = observer(() => {
  const notes = useNotesStore();
  const { batteryLevel } = useDeviceStatus();

  const values: Record<string, string> = {};
  if (batteryLevel != null) {
    values.core_device_status = `${Math.round(batteryLevel * 100)}%`;
  }
  if (notes.notes.length > 0) {
    values.core_notepad = String(notes.notes.length);
  }

  return (
    <ModuleScreen
      title="Core"
      icon="pulse-outline"
      tools={CORE_TOOLS}
      values={values}
    />
  );
});

export default CoreModule;
