import {
  COMMUNICATION_TOOLS,
  CORE_TOOLS,
  EARTH_TOOLS,
  NAVIGATION_TOOLS,
  PREPPER_TOOLS,
  REFERENCE_TOOLS,
} from '../../constants';
import type { ToolType } from '../types/common-types';

export type ToolWithModule = ToolType & {
  module: 'Core' | 'Navigation' | 'Reference' | 'Comms' | 'Prepper' | 'Earth';
};

export const ALL_TOOLS: ToolWithModule[] = [
  ...CORE_TOOLS.map((tool) => ({ ...tool, module: 'Core' as const })),
  ...NAVIGATION_TOOLS.map((tool) => ({
    ...tool,
    module: 'Navigation' as const,
  })),
  ...REFERENCE_TOOLS.map((tool) => ({
    ...tool,
    module: 'Reference' as const,
  })),
  ...COMMUNICATION_TOOLS.map((tool) => ({
    ...tool,
    module: 'Comms' as const,
  })),
  ...PREPPER_TOOLS.map((tool) => ({ ...tool, module: 'Prepper' as const })),
  ...EARTH_TOOLS.map((tool) => ({ ...tool, module: 'Earth' as const })),
];

export function getToolById(id: string): ToolWithModule | undefined {
  return ALL_TOOLS.find((tool) => tool.id === id);
}
