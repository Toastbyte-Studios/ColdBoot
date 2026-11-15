import { z } from 'zod';

/**
 * Shape of a stored repeater, for every place one is read back from outside
 * the app's memory: the RepeaterBook cache and the custom-repeater list in
 * AsyncStorage, and backup files. Matches `Repeater` in RepeaterBookStore.
 */
export const RepeaterSchema = z.object({
  id: z.string(),
  callSign: z.string(),
  frequency: z.string(),
  offset: z.string(),
  tone: z.string(),
  mode: z.string(),
  city: z.string(),
  state: z.string(),
  lat: z.number(),
  lng: z.number(),
  operationalStatus: z.string(),
  use: z.string(),
  notes: z.string(),
  lastEdited: z.string(),
  distance: z.number(),
  emcomm: z.string(),
  isCustom: z.boolean().optional(),
});

/** The cached result of a RepeaterBook query. */
export const RepeaterCacheSchema = z.object({
  repeaters: z.array(RepeaterSchema),
  queryLat: z.number(),
  queryLng: z.number(),
  lastUpdated: z.string(),
  queriedStates: z.array(z.string()).optional(),
});
