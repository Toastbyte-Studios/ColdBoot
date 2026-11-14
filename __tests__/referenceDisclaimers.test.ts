import healthData from '../src/data/health.json';
import {
  ALL_REFERENCE_ENTRIES,
  findReferenceDisclaimer,
} from '../src/utils/referenceEntries';

describe('findReferenceDisclaimer', () => {
  it("returns the entry's own book disclaimer", () => {
    const entry = healthData.entries[0];
    expect(findReferenceDisclaimer(entry.id)).toBe(
      healthData.metadata.disclaimer,
    );
  });

  // The point of the lookup: an entry opened from Search or Bookmarks must
  // not be shown without the disclaimer its category screen would have had.
  it('has a disclaimer for every entry the Entry screen can open', () => {
    const missing = ALL_REFERENCE_ENTRIES.filter(
      (entry) => !findReferenceDisclaimer(entry.id),
    ).map((entry) => entry.id);

    expect(missing).toEqual([]);
  });

  it('returns null for an id no book has', () => {
    expect(findReferenceDisclaimer('no-such-entry')).toBeNull();
  });
});
