import emergencyData from '../data/emergency.json';
import healthData from '../data/health.json';
import homePrepData from '../data/homePrep.json';
import roadsideData from '../data/roadside.json';
import survivalData from '../data/survival.json';
import toolsData from '../data/tools.json';
import weatherData from '../data/weather.json';
import ReferenceEntryType from '../types/data-type';

/** Every entry the Entry screen can open, from all seven reference books. */
export const ALL_REFERENCE_ENTRIES: readonly ReferenceEntryType[] = [
  ...emergencyData.entries,
  ...healthData.entries,
  ...homePrepData.entries,
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

/** Each reference book's entries with the disclaimer its dataset carries. */
const BOOKS: readonly {
  entries: readonly ReferenceEntryType[];
  disclaimer?: string;
}[] = [
  { entries: emergencyData.entries, ...emergencyData.metadata },
  { entries: healthData.entries, ...healthData.metadata },
  { entries: homePrepData.entries, ...homePrepData.metadata },
  { entries: roadsideData.entries, ...roadsideData.metadata },
  { entries: survivalData.entries, ...survivalData.metadata },
  { entries: toolsData.entries, ...toolsData.metadata },
  { entries: weatherData.entries, ...weatherData.metadata },
];

let disclaimerMap: Map<string, string> | null = null;

/**
 * The disclaimer of the book an entry belongs to, or null when the entry
 * isn't in a book or its book has none.
 *
 * A category screen shows its book's disclaimer, but an entry is also opened
 * straight from Search, Bookmarks and the "Continue" card, which skip that
 * screen. Looking it up by entry id lets the entry carry it wherever it was
 * opened from.
 */
export function findReferenceDisclaimer(id: string): string | null {
  if (!disclaimerMap) {
    disclaimerMap = new Map();
    for (const book of BOOKS) {
      const disclaimer = book.disclaimer?.trim();
      if (!disclaimer) continue;
      for (const entry of book.entries) {
        disclaimerMap.set(entry.id, disclaimer);
      }
    }
  }
  return disclaimerMap.get(id) ?? null;
}
