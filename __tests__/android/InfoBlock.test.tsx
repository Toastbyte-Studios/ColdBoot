import React from 'react';
import { StyleSheet, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import InfoBlock from '../../src/components/InfoBlock';
import { SCREEN_GUTTER } from '../../src/theme';
import { LIGHT_COLORS } from '../../src/theme/colors';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => require('../../src/theme/colors').LIGHT_COLORS,
}));

async function blockStyle(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style);
}

describe('InfoBlock on Android', () => {
  it.each([
    ['info', LIGHT_COLORS.SECONDARY_CONTAINER],
    ['tip', LIGHT_COLORS.TERTIARY_CONTAINER],
    ['caution', LIGHT_COLORS.ACCENT_CONTAINER],
  ] as const)(
    'puts the %s tone in the fill, not an edge',
    async (tone, fill) => {
      const style = await blockStyle(<InfoBlock tone={tone}>Copy.</InfoBlock>);
      expect(style.backgroundColor).toBe(fill);
      expect(style.borderLeftWidth).toBeUndefined();
    },
  );

  it('carries the screen gutter on the full-bleed page', async () => {
    const style = await blockStyle(<InfoBlock>Copy.</InfoBlock>);
    expect(style.marginHorizontal).toBe(SCREEN_GUTTER);
  });

  it('drops the gutter when inline in an inset column', async () => {
    const style = await blockStyle(<InfoBlock inline>Copy.</InfoBlock>);
    expect(style.marginHorizontal).toBeUndefined();
  });
});
