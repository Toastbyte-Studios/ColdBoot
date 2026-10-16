/**
 * @format
 */

import emergencyData from '../src/data/emergency.json';
import healthData from '../src/data/health.json';
import roadsideData from '../src/data/roadside.json';
import survivalData from '../src/data/survival.json';
import toolsData from '../src/data/tools.json';
import weatherData from '../src/data/weather.json';
import { ragSearch } from '../src/utils/ragSearch';
import { searchItems } from '../src/utils/searchData';

const entries = roadsideData.entries;

describe('Roadside reference data', () => {
  test('has entries', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  test('every entry has the fields the entry screen renders', () => {
    for (const entry of entries) {
      expect(entry.id).toMatch(/^roadside_/);
      expect(entry.title.trim()).not.toBe('');
      expect(entry.summary.trim()).not.toBe('');
      expect(entry.steps.length).toBeGreaterThan(0);
      expect(entry.tags.length).toBeGreaterThan(0);
      expect(roadsideData.metadata.difficulty_levels).toContain(
        entry.difficulty,
      );
    }
  });

  test('every entry belongs to a listed category, and every category has entries', () => {
    const categories = roadsideData.metadata.categories;
    for (const entry of entries) {
      expect(categories).toContain(entry.category);
    }
    for (const category of categories) {
      expect(entries.some((e) => e.category === category)).toBe(true);
    }
  });

  test('ids are unique across all reference data (bookmarks key on id)', () => {
    const ids = [
      ...emergencyData.entries,
      ...healthData.entries,
      ...survivalData.entries,
      ...toolsData.entries,
      ...weatherData.entries,
      ...roadsideData.entries,
    ].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Roadside search', () => {
  test.each(entries.map((e) => [e.title, e.id]))(
    'keyword search finds "%s"',
    (title, id) => {
      const results = searchItems(title);
      expect(
        results.some((item) => item.type === 'reference' && item.id === id),
      ).toBe(true);
    },
  );

  test('finds the Roadside tile itself', () => {
    const results = searchItems('roadside');
    expect(
      results.some(
        (item) => item.type === 'tool' && item.id === 'ref_roadside',
      ),
    ).toBe(true);
  });

  test('natural-language search finds the spare tire guide', () => {
    const result = ragSearch('how do I change a flat tire');
    expect(result.hasResults).toBe(true);
    const ids = result.results.map((r) => r.entry.id);
    expect(ids).toContain('roadside_change_flat_spare');
  });

  test('natural-language search finds the plug kit guide', () => {
    const result = ragSearch('nail in my tire slow leak');
    expect(result.hasResults).toBe(true);
    const ids = result.results.map((r) => r.entry.id);
    expect(ids).toContain('roadside_tire_plug_sealant');
  });
});
