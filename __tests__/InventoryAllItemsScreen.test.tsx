/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import InventoryAllItemsScreen from '../src/screens/Inventory/InventoryAllItemsScreen';

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

const mockInventoryStore = {
  allItemsSorted: defaultItems,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/stores', () => ({
  useInventoryStore: () => mockInventoryStore,
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
    <MockText testID="inventory-row">
      {[title, subtitle, value].filter(Boolean).join(' | ')}
    </MockText>
  );
});

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

describe('InventoryAllItemsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockStackScreen.mockReset();
    mockInventoryStore.allItemsSorted = defaultItems;
  });

  it('uses StackScreen with an item count subtitle and module rows', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<InventoryAllItemsScreen />);
    });

    expect(mockStackScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'All Inventory Items',
        subtitle: '2 items',
      }),
    );

    const rowLabels = Array.from(
      new Set(
        tree.root
          .findAllByProps({ testID: 'inventory-row' })
          .map((row) => row.props.children),
      ),
    );
    expect(rowLabels).toEqual([
      'Beans | Canned Goods. Notes: Rotate soon | Quantity: 4 cans',
      'Rice | Dry Goods | Quantity: 10 lbs',
    ]);
  });

  it('shows the helper text when there are no inventory items', () => {
    mockInventoryStore.allItemsSorted = [];

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<InventoryAllItemsScreen />);
    });

    const texts = tree.root.findAllByType(Text);
    expect(texts.map((node) => node.props.children)).toContain(
      'No inventory items yet. Add items from a category.',
    );
  });
});
