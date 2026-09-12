import React from 'react';
import { COMMUNICATION_TOOLS } from '../../../constants';
import ModuleScreen from '../../components/ModuleScreen';

/**
 * The Communications module: ways to be heard or understood without a network.
 */
export default function CommunicationsModule() {
  return (
    <ModuleScreen
      title="Comms"
      icon="chatbubbles-outline"
      tools={COMMUNICATION_TOOLS}
    />
  );
}
