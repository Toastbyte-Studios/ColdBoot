import React from 'react';
import { PREPPER_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';

/**
 * The Prepper module: what you have, and how long it lasts.
 */
export default function PrepperModule() {
  return (
    <ModuleScreen
      title="Prepper"
      icon="shield-checkmark-outline"
      tools={PREPPER_TOOLS}
    />
  );
}
