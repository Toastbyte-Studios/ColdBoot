import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import InfoBlock from '../src/components/InfoBlock';
import { LIGHT_COLORS } from '../src/theme/colors';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

function iconName(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.findByType('Ionicons' as unknown as React.ElementType).props
    .name;
}

function blockStyle(tree: ReactTestRenderer.ReactTestRenderer) {
  // The outermost View is the card.
  return StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style);
}

describe('InfoBlock', () => {
  it('sets a string as body text with the info glyph', async () => {
    const tree = await render(
      <InfoBlock>Press SPACE between letters.</InfoBlock>,
    );
    const texts = tree.root.findAllByType(Text).map((t) => t.props.children);
    expect(texts).toContain('Press SPACE between letters.');
    expect(iconName(tree)).toBe('information-circle-outline');
  });

  it('keeps interpolated numbers in the same paragraph', async () => {
    const pct = 30;
    const tree = await render(<InfoBlock>Above {pct}% is surplus.</InfoBlock>);
    expect(tree.root.findAllByType(Text)).toHaveLength(1);
  });

  it('shows a title above the copy', async () => {
    const tree = await render(
      <InfoBlock title="Tip">Carry a whistle.</InfoBlock>,
    );
    const texts = tree.root.findAllByType(Text).map((t) => t.props.children);
    expect(texts).toEqual(['Tip', 'Carry a whistle.']);
  });

  it('lays out non-text children as given rather than inside a Text', async () => {
    const tree = await render(
      <InfoBlock>
        <View testID="rows">
          <Text>Timestamp</Text>
        </View>
      </InfoBlock>,
    );
    const rows = tree.root.findByProps({ testID: 'rows' });
    expect(rows.parent?.type).not.toBe(Text);
  });

  it.each([
    ['tip', 'bulb-outline', LIGHT_COLORS.SECONDARY_ACCENT],
    ['caution', 'alert-circle-outline', LIGHT_COLORS.ACCENT],
    ['info', 'information-circle-outline', LIGHT_COLORS.BRAND],
  ] as const)(
    'gives the %s tone its glyph and leading edge',
    async (tone, icon, edge) => {
      const tree = await render(<InfoBlock tone={tone}>Copy.</InfoBlock>);
      expect(iconName(tree)).toBe(icon);
      // Jest runs as iOS: the tone is the card's leading edge.
      expect(blockStyle(tree).borderLeftColor).toBe(edge);
    },
  );

  it('lets an explicit icon override the tone glyph', async () => {
    const tree = await render(
      <InfoBlock tone="tip" icon="airplane-outline">
        Copy.
      </InfoBlock>,
    );
    expect(iconName(tree)).toBe('airplane-outline');
  });
});
