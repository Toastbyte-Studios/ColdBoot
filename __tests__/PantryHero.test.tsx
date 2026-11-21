import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import PantryHero from '../src/screens/Pantry/PantryHero';
import {
  calorieText,
  calorieTotal,
  pantryHeroState,
} from '../src/screens/Pantry/pantryUseFirst';
import type { PantryItem } from '../src/stores/PantryStore';

const item = (name: string, extra: Partial<PantryItem> = {}): PantryItem => ({
  id: name,
  name,
  category: 'Canned Goods',
  quantity: 1,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

// Days left, keyed by name; anything missing is undated.
const DAYS: Record<string, number> = {
  Beans: 12,
  Rice: 200,
  Soup: -20,
  Oats: 0,
};
const daysLeft = (i: PantryItem) => DAYS[i.name] ?? null;
const dated = (name: string, extra: Partial<PantryItem> = {}) =>
  item(name, { expirationMonth: 3, expirationYear: 2027, ...extra });

const mockNavigate = jest.fn();
const mockPantry = {
  items: [] as PantryItem[],
  getExpirationDaysRemaining: daysLeft,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: jest.fn(() => () => {}),
  }),
}));
jest.mock('../src/stores', () => ({
  usePantryStore: () => mockPantry,
}));
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

describe('pantryUseFirst', () => {
  it('prompts an empty pantry', () => {
    expect(pantryHeroState([], daysLeft).headline).toBe('Stock your pantry');
  });

  it('asks for dates when nothing is dated', () => {
    expect(pantryHeroState([item('Salt')], daysLeft)).toMatchObject({
      headline: 'No dates yet',
      tone: 'muted',
    });
  });

  it('leads with expired food, and counts both tiers', () => {
    const state = pantryHeroState(
      [
        dated('Rice'),
        dated('Beans'),
        dated('Soup', { expirationMonth: 10, expirationYear: 2026 }),
        dated('Oats'),
        item('Salt'),
      ],
      daysLeft,
    );
    expect(state).toMatchObject({
      eyebrow: 'Expired',
      headline: 'Soup',
      tone: 'poor',
      expired: 2,
      expiringSoon: 1,
    });
    expect(state.detail).toContain('Expired Oct 2026');
  });

  it('otherwise leads with what expires soonest', () => {
    expect(
      pantryHeroState([dated('Rice'), dated('Beans')], daysLeft),
    ).toMatchObject({ eyebrow: 'Use first', headline: 'Beans', tone: 'fair' });
    const later = pantryHeroState([dated('Rice')], daysLeft);
    expect(later.tone).toBeUndefined();
    expect(later.detail).toBe('Expires Mar 2027. Nothing else is due sooner.');
  });

  it('skips used-up items when picking what to use first', () => {
    expect(
      pantryHeroState(
        [dated('Soup', { quantity: 0 }), dated('Rice')],
        daysLeft,
      ),
    ).toMatchObject({ headline: 'Rice', expired: 1 });
    expect(
      pantryHeroState([dated('Rice', { quantity: 0 })], daysLeft).headline,
    ).toBe('Stock your pantry');
  });

  it('totals calories from items with label facts', () => {
    const labelled = item('Beans', {
      quantity: 4,
      caloriesPerServing: 110,
      servingsPerUnit: 3.5,
    });
    expect(calorieTotal([item('Salt')])).toBeNull();
    expect(calorieTotal([labelled])).toEqual({ total: 1540, partial: false });
    expect(calorieTotal([labelled, item('Salt')])?.partial).toBe(true);
    // A used-up labelled item is still known, so the total isn't a floor.
    expect(
      calorieTotal([labelled, { ...labelled, id: 'empty', quantity: 0 }]),
    ).toEqual({ total: 1540, partial: false });
  });

  it('formats calorie totals', () => {
    expect(calorieText({ total: 850, partial: false })).toBe('850 kcal');
    expect(calorieText({ total: 1540, partial: true })).toBe('1.5k+ kcal');
    expect(calorieText({ total: 48_200, partial: false })).toBe('48k kcal');
    expect(calorieText({ total: 1_250_000, partial: false })).toBe('1.3M kcal');
  });
});

describe('PantryHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  beforeEach(async () => {
    mockNavigate.mockClear();
    mockPantry.items = [
      dated('Beans', { caloriesPerServing: 100, servingsPerUnit: 2 }),
      dated('Rice'),
    ];
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<PantryHero />);
    });
  });

  afterEach(() => ReactTestRenderer.act(() => tree.unmount()));

  const texts = () =>
    tree.root
      .findAll((node) => typeof node.props.children === 'string')
      .map((node) => node.props.children as string);

  const pressable = (label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it('shows the item to use first and opens the tracker', () => {
    expect(texts()).toEqual(expect.arrayContaining(['Beans', '200+ kcal']));
    pressable(
      'Use first. Beans. Expires Mar 2027. Plan it into the next few weeks of meals.',
    ).props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('PantryExpirationTracker');
  });

  it('opens all items from the calorie total', () => {
    pressable(
      'Calories on hand: 200+ kcal, from the items with label facts',
    ).props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('PantryAllItems');
  });
});
