/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PantryAllItemsScreen from '../src/screens/Pantry/PantryAllItemsScreen';

const mockNavigate = jest.fn();
const mockStackScreen = jest.fn();

const defaultItems = [
  {
    id: 'beans',
    name: 'Beans',
    category: 'Canned Goods',
    quantity: 4,
    unit: 'cans',
    notes: 'Rotate soon',
  },
  {
    id: 'rice',
    name: 'Rice',
    category: 'Dry Goods',
    quantity: 10,
    unit: 'lbs',
  },
];

const mockPantryStore = {
  allItemsSorted: defaultItems,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/stores', () => ({
  usePantryStore: () => mockPantryStore,
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView, Text: MockText } = require('react-native');
  return (props: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => {
    mockStackScreen(props);
    return (
      <MockView>
        <MockText>{props.title}</MockText>
        {props.subtitle ? <MockText>{props.subtitle}</MockText> : null}
        {props.children}
      </MockView>
    );
  };
});

jest.mock('../src/components/GroupContainer', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/ModuleRow', () => {
  const { Text: MockText } = require('react-native');
  return ({
    title,
    subtitle,
    value,
  }: {
    title: string;
    subtitle?: string;
    value?: string;
  }) => (
    <MockText testID="pantry-row">
      {[title, subtitle, value].filter(Boolean).join(' | ')}
    </MockText>
  );
});

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

describe('PantryAllItemsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockStackScreen.mockReset();
    mockPantryStore.allItemsSorted = defaultItems;
  });

  it('uses StackScreen with an item count subtitle and module rows', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<PantryAllItemsScreen />);
    });

    expect(mockStackScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'All Pantry Items',
        subtitle: '2 items',
      }),
    );

    const rowLabels = Array.from(
      new Set(
        tree.root
          .findAllByProps({ testID: 'pantry-row' })
          .map((row) => row.props.children),
      ),
    );
    expect(rowLabels).toEqual([
      'Beans | Canned Goods · Rotate soon | Quantity: 4 cans',
      'Rice | Dry Goods | Quantity: 10 lbs',
    ]);
  });

  it('shows the helper text when there are no pantry items', () => {
    mockPantryStore.allItemsSorted = [];

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<PantryAllItemsScreen />);
    });

    const texts = tree.root.findAllByType(Text);
    expect(texts.map((node) => node.props.children)).toContain(
      'No pantry items yet. Add items from a category.',
    );
  });
});
