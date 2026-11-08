import React from 'react';
import { Text as RNText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ModuleHero from '../src/components/ModuleHero';

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

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(RNText)
    .map((node) => React.Children.toArray(node.props.children).join(''));

describe('ModuleHero', () => {
  it('shows the eyebrow, headline, detail and every stat', async () => {
    const tree = await render(
      <ModuleHero
        eyebrow="Pressure trend"
        headline="Falling fast"
        detail="Weather likely worsening"
        stats={[
          { label: 'Next event', value: 'Supermoon · 18 days' },
          { label: 'Day length', value: '10 h 12 m' },
        ]}
      />,
    );
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'Falling fast',
        'Weather likely worsening',
        'NEXT EVENT',
        'Supermoon · 18 days',
        'DAY LENGTH',
      ]),
    );
  });

  it('opens the headline and a tappable stat', async () => {
    const onPress = jest.fn();
    const onStat = jest.fn();
    const tree = await render(
      <ModuleHero
        eyebrow="Position"
        headline="11S LT 85406 69434"
        onPress={onPress}
        stats={[
          { label: 'Rally point', value: '1.2 mi NE', onPress: onStat },
          { label: 'Track', value: 'Off' },
        ]}
      />,
    );
    const buttons = tree.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );
    buttons
      .find((node) => node.props.accessibilityLabel.startsWith('Position'))
      ?.props.onPress();
    buttons
      .find(
        (node) => node.props.accessibilityLabel === 'Rally point: 1.2 mi NE',
      )
      ?.props.onPress();

    expect(onPress).toHaveBeenCalled();
    expect(onStat).toHaveBeenCalled();
    // A stat with nothing to open is not announced as a button.
    expect(
      buttons.some((node) => node.props.accessibilityLabel === 'Track: Off'),
    ).toBe(false);
  });
});
