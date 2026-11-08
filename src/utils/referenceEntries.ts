import emergencyData from '../data/emergency.json';
import healthData from '../data/health.json';
import roadsideData from '../data/roadside.json';
import survivalData from '../data/survival.json';
import toolsData from '../data/tools.json';
import weatherData from '../data/weather.json';
import ReferenceEntryType from '../types/data-type';

/** Every entry the Entry screen can open, from all six reference books. */
export const ALL_REFERENCE_ENTRIES: readonly ReferenceEntryType[] = [
  ...emergencyData.entries,
  ...healthData.entries,
  ...roadsideData.entries,
  ...survivalData.entries,
  ...toolsData.entries,
  ...weatherData.entries,
];

let entryMap: Map<string, ReferenceEntryType> | null = null;

/** Reference entries by id, built on first use. */
export function referenceEntryMap(): ReadonlyMap<string, ReferenceEntryType> {
  if (!entryMap) {
    entryMap = new Map(ALL_REFERENCE_ENTRIES.map((entry) => [entry.id, entry]));
  }
  return entryMap;
}

/** The reference entry with this id, or null when no book has it. */
export function findReferenceEntry(id: string): ReferenceEntryType | null {
  return referenceEntryMap().get(id) ?? null;
}
