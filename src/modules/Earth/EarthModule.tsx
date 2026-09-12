import React from 'react';
import { EARTH_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';

/**
 * The Earth module: what the sky and the air are doing, computed locally.
 */
export default function EarthModule() {
  return (
    <ModuleScreen title="Earth" icon="earth-outline" tools={EARTH_TOOLS} />
  );
}
