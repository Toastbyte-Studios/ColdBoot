/**
 * @format
 */

import fs from 'fs';
import path from 'path';
import { REFERENCE_TOOLS } from '../constants';
import emergencyData from '../src/data/emergency.json';
import healthData from '../src/data/health.json';
import homePrepData from '../src/data/homePrep.json';
import roadsideData from '../src/data/roadside.json';
import survivalData from '../src/data/survival.json';
import toolsData from '../src/data/tools.json';
import weatherData from '../src/data/weather.json';
import { emergencyCategories } from '../src/screens/Reference/EmergencyScreen';
import { healthCategories } from '../src/screens/Reference/HealthScreen';
import { homePrepCategories } from '../src/screens/Reference/HomePrepScreen';
import { roadsideCategories } from '../src/screens/Reference/RoadsideScreen';
import { survivalCategories } from '../src/screens/Reference/SurvivalScreen';
import { toolsAndKnotsCategories } from '../src/screens/Reference/ToolsAndKnotsScreen';
import { weatherCategories } from '../src/screens/Reference/WeatherScreen';
import { CategoryType } from '../src/types/common-types';
import ReferenceEntryType from '../src/types/data-type';
import { ragSearch } from '../src/utils/ragSearch';
import { ALL_REFERENCE_ENTRIES } from '../src/utils/referenceEntries';
import { searchItems } from '../src/utils/searchData';

// The screen modules render CategoryList, which pulls in navigation; only
// their category lists are under test here.
jest.mock('../src/components/CategoryList', () => () => null);

type Book = {
  name: string;
  data: {
    metadata: { categories: string[]; difficulty_levels: string[] };
    entries: ReferenceEntryType[];
  };
  screenCategories: CategoryType[];
};

const BOOKS: Book[] = [
  { name: 'Health', data: healthData, screenCategories: healthCategories },
  {
    name: 'Survival',
    data: survivalData,
    screenCategories: survivalCategories,
  },
  { name: 'Weather', data: weatherData, screenCategories: weatherCategories },
  {
    name: 'Tools & Knots',
    data: toolsData,
    screenCategories: toolsAndKnotsCategories,
  },
  {
    name: 'Emergency',
    data: emergencyData,
    screenCategories: emergencyCategories,
  },
  {
    name: 'Roadside',
    data: roadsideData,
    screenCategories: roadsideCategories,
  },
  {
    name: 'Home Prep',
    data: homePrepData,
    screenCategories: homePrepCategories,
  },
];

const navigatorSource = fs.readFileSync(
  path.join(__dirname, '../src/navigation/AppNavigator.tsx'),
  'utf8',
);

describe.each(BOOKS)('$name reference book', ({ data, screenCategories }) => {
  test('every entry has the fields the entry screen renders', () => {
    for (const entry of data.entries) {
      expect(entry.title.trim()).not.toBe('');
      expect(entry.summary.trim()).not.toBe('');
      expect(entry.steps.length).toBeGreaterThan(0);
      expect(entry.tags.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.do_not)).toBe(true);
      expect(Array.isArray(entry.watch_for)).toBe(true);
      expect(Array.isArray(entry.notes)).toBe(true);
      expect(data.metadata.difficulty_levels).toContain(entry.difficulty);
    }
  });

  test('every entry belongs to a listed category, and every category has entries', () => {
    for (const entry of data.entries) {
      expect(data.metadata.categories).toContain(entry.category);
    }
    for (const category of data.metadata.categories) {
      expect(data.entries.some((e) => e.category === category)).toBe(true);
    }
  });

  test('the screen lists exactly the data categories', () => {
    const screen = screenCategories.map((c) => c.category).sort();
    expect(screen).toEqual([...data.metadata.categories].sort());
  });

  test('screen category icons are Ionicons outline variants', () => {
    for (const category of screenCategories) {
      expect(category.icon).toMatch(/-outline$/);
    }
  });

  test('related screen links point at registered routes', () => {
    for (const entry of data.entries) {
      if (entry.related_screen) {
        expect(navigatorSource).toContain(`name="${entry.related_screen}"`);
        expect(entry.related_screen_label?.trim()).toBeTruthy();
      }
    }
  });
});

describe('Reference library', () => {
  test('ids are unique across every book (bookmarks key on id)', () => {
    const ids = ALL_REFERENCE_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the entry lookup covers every book', () => {
    const total = BOOKS.reduce((sum, b) => sum + b.data.entries.length, 0);
    expect(ALL_REFERENCE_ENTRIES.length).toBe(total);
  });

  test('every book has a Reference tile with a registered route', () => {
    for (const tool of REFERENCE_TOOLS) {
      expect(navigatorSource).toContain(`name="${tool.screen}"`);
    }
    expect(REFERENCE_TOOLS.some((t) => t.screen === 'HomePrep')).toBe(true);
  });

  test.each(ALL_REFERENCE_ENTRIES.map((e) => [e.title, e.id]))(
    'keyword search finds "%s"',
    (title, id) => {
      const results = searchItems(title);
      expect(
        results.some((item) => item.type === 'reference' && item.id === id),
      ).toBe(true);
    },
  );

  test.each([
    ['chest pain spreading to my arm', 'emergency_heart_attack'],
    ['someone is having a seizure', 'emergency_seizure'],
    ['bitten by a rattlesnake', 'injury_snakebite'],
    ['how do I remove a tick', 'injury_tick_bites'],
    ['altitude sickness headache', 'illness_altitude_sickness'],
    ['carbon monoxide from generator', 'homeprep_generator_safety'],
    ['fell through the ice', 'water_ice_falling_through_ice'],
    ['what to do in an earthquake', 'disaster_earthquake'],
    ['tornado warning where to shelter', 'weather_tornado_safety'],
    ['car sinking in water', 'roadside_sinking_vehicle'],
    ['find north without a compass', 'navigation_without_compass'],
    ['how much water should I store', 'homeprep_water_storage'],
    [
      'bleach drops per gallon to disinfect water',
      'homeprep_water_disinfecting',
    ],
    ['freezer food after power outage', 'homeprep_food_power_outage'],
    ['what goes in a go bag', 'homeprep_go_bag'],
    ['square lashing poles', 'lashing_square'],
  ])('natural-language search: "%s"', (query, id) => {
    const result = ragSearch(query);
    expect(result.results.map((r) => r.entry.id)).toContain(id);
  });

  test('finds the Home Prep tile itself', () => {
    const results = searchItems('home prep');
    expect(
      results.some(
        (item) => item.type === 'tool' && item.id === 'ref_home_prep',
      ),
    ).toBe(true);
  });
});
