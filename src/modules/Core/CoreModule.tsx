import { observer } from 'mobx-react-lite';
import React from 'react';
import { CORE_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';
import { useNotesStore } from '../../stores/StoreContext';
import CoreHero from './CoreHero';

/**
 * The Core module: the tools that work with nothing but the device itself.
 *
 * The hero leads with the battery, the constraint every other tool here
 * spends, so the Device Status row no longer repeats the percentage. Notepad
 * keeps its note count on the row.
 */
const CoreModule = observer(() => {
  const notes = useNotesStore();

  const values: Record<string, string> = {};
  if (notes.notes.length > 0) {
    values.core_notepad = String(notes.notes.length);
  }

  return (
    <ModuleScreen
      title="Core"
      tools={CORE_TOOLS}
      values={values}
      hero={<CoreHero />}
    />
  );
});

export default CoreModule;
