import {
  COMMUNICATION_TOOLS,
  CORE_TOOLS,
  EARTH_TOOLS,
  NAVIGATION_TOOLS,
  PREPPER_TOOLS,
  REFERENCE_TOOLS,
} from '../../../constants';

/**
 * One-line summaries of what each module holds, keyed by the module ids in
 * the root `constants.ts`.
 *
 * These live beside the module list rather than in `constants.ts` so the tool
 * metadata stays a plain data table; this is presentation copy, and only Home
 * and the Modules tab render it.
 */
export const MODULE_SUBTITLES: Record<string, string> = {
  home_communications: 'Morse · whistle · frequencies',
  home_core: 'Flashlight · notepad · status',
  home_earth: 'Sun · moon · pressure · sky',
  home_navigation: 'Offline maps · grid · star map',
  home_prepper: 'Pantry · inventory · planning',
  home_reference: 'Health · survival · weather',
};

/**
 * How many tools each module holds, for the trailing value on Android's list
 * items.
 *
 * Derived from the tool tables rather than written down: Navigation's count
 * already varies by build because of the dev-only Map Spike entry, and a
 * hand-written number goes stale the first time a tool is added.
 */
export const MODULE_TOOL_COUNTS: Record<string, number> = {
  home_communications: COMMUNICATION_TOOLS.length,
  home_core: CORE_TOOLS.length,
  home_earth: EARTH_TOOLS.length,
  home_navigation: NAVIGATION_TOOLS.length,
  home_prepper: PREPPER_TOOLS.length,
  home_reference: REFERENCE_TOOLS.length,
};
