import React from 'react';
import { NAVIGATION_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';

/**
 * The Navigation module: knowing where you are without a map server.
 */
export default function NavigationModule() {
  return (
    <ModuleScreen
      title="Navigation"
      icon="compass-outline"
      tools={NAVIGATION_TOOLS}
    />
  );
}
