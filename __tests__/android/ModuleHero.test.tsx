import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ModuleHero from '../../src/components/ModuleHero';

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => require('../../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

describe('ModuleHero on Android', () => {
  it('shows each stat as a chip, which opens what it summarises', async () => {
    const onPress = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ModuleHero
          eyebrow="Battery"
          headline="64% · about 5 hr left"
          stats={[
            { label: 'Readiness', value: '3 of 4', tone: 'fair', onPress },
          ]}
        />,
      );
    });

    const chip = tree.root.find(
      (node) =>
        node.props.accessibilityLabel === 'Readiness: 3 of 4' &&
        typeof node.props.onPress === 'function',
    );
    chip.props.onPress();
    expect(onPress).toHaveBeenCalled();
  });
});
