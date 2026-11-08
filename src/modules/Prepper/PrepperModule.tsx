import React from 'react';
import { PREPPER_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';
import PrepperHero from './PrepperHero';

/**
 * The Prepper module: what you have, and how long it lasts.
 */
export default function PrepperModule() {
  return (
    <ModuleScreen
      title="Prepper"
      tools={PREPPER_TOOLS}
      hero={<PrepperHero />}
    />
  );
}
