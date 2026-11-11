import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ReferenceTable from '../src/components/ReferenceTable';
import NatoPhoneticScreen from '../src/screens/MorseCode/NatoPhoneticScreen';

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

describe('NatoPhoneticScreen', () => {
  async function render() {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<NatoPhoneticScreen />);
    });
    return tree;
  }

  const shownKeys = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root
      .findAllByType(ReferenceTable)
      .flatMap((table) =>
        table.props.rows.map((row: { key: string }) => row.key),
      );

  const toggle = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.find(
      (node) =>
        node.props.testID === 'nato-table-toggle' &&
        Array.isArray(node.props.values),
    );

  const select = async (
    tree: ReactTestRenderer.ReactTestRenderer,
    index: number,
  ) => {
    await ReactTestRenderer.act(async () => {
      toggle(tree).props.onChange({
        nativeEvent: { selectedSegmentIndex: index },
      });
    });
  };

  it('shows only the letters at first', async () => {
    const tree = await render();

    expect(toggle(tree).props.values).toEqual(['Letters', 'Numerals']);
    expect(toggle(tree).props.selectedIndex).toBe(0);
    const keys = shownKeys(tree);
    expect(keys).toHaveLength(26);
    expect(keys[0]).toBe('A');
    expect(keys[25]).toBe('Z');
  });

  it('switches to the numerals and back', async () => {
    const tree = await render();

    await select(tree, 1);
    expect(toggle(tree).props.selectedIndex).toBe(1);
    expect(shownKeys(tree)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);

    await select(tree, 0);
    expect(shownKeys(tree)).toHaveLength(26);
  });
});
