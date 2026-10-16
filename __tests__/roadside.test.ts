/**
 * @format
 */

import emergencyData from '../src/data/emergency.json';
import healthData from '../src/data/health.json';
import roadsideData from '../src/data/roadside.json';
import survivalData from '../src/data/survival.json';
import toolsData from '../src/data/tools.json';
import weatherData from '../src/data/weather.json';
import { roadsideCategories } from '../src/screens/Reference/RoadsideScreen';
import { ragSearch } from '../src/utils/ragSearch';
import { searchItems } from '../src/utils/searchData';

// The screen module renders CategoryList, which pulls in navigation; only
// its category list is under test here.
jest.mock('../src/components/CategoryList', () => () => null);

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

  test('the Roadside screen lists exactly the data categories', () => {
    const screenTitles = roadsideCategories.map((c) => c.title).sort();
    expect(screenTitles).toEqual([...roadsideData.metadata.categories].sort());
    for (const category of roadsideCategories) {
      expect(category.category).toBe(category.title);
    }
  });

  test('related screen links point at real routes', () => {
    const routes = ['ScenarioCards', 'ToolsAndKnots', 'Checklist'];
    for (const entry of entries as { related_screen?: string }[]) {
      if (entry.related_screen) {
        expect(routes).toContain(entry.related_screen);
      }
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

  test.each([
    ['jump start a dead battery with cables', 'roadside_jump_start_cables'],
    ['portable jump starter pack', 'roadside_jump_pack'],
    ["car won't start just clicking", 'roadside_no_start_diagnosis'],
    ['corroded battery terminals', 'roadside_battery_terminals'],
    ['headlights stopped working blown fuse', 'roadside_blown_fuse'],
    ['engine overheating steam from hood', 'roadside_overheating'],
    ['how do I check my engine oil', 'roadside_oil_coolant_check'],
    ['oil pressure warning light on dashboard', 'roadside_warning_lights'],
    ['ran out of gas on the highway', 'roadside_out_of_fuel'],
  ])('natural-language search: "%s"', (query, id) => {
    const result = ragSearch(query);
    expect(result.results.map((r) => r.entry.id)).toContain(id);
  });

  test('natural-language search finds the plug kit guide', () => {
    const result = ragSearch('nail in my tire slow leak');
    expect(result.hasResults).toBe(true);
    const ids = result.results.map((r) => r.entry.id);
    expect(ids).toContain('roadside_tire_plug_sealant');
  });
});
