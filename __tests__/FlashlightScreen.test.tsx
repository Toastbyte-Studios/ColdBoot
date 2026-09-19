import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { FlashlightModes } from '../constants';
import FlashlightScreen from '../src/screens/Flashlight/FlashlightScreen';

let mockStore = {
  flashlightMode: FlashlightModes.OFF,
  strobeFrequencyHz: 7,
  sosWithTone: false,
  setFlashlightMode: jest.fn(),
  setStrobeFrequency: jest.fn(),
  setSosWithTone: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/stores/StoreContext', () => ({
  useSignalingStore: () => mockStore,
}));

jest.mock('../src/components/StackScreen', () => {
  const { Text: MockText, View: MockView } = require('react-native');
  return ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <MockView>
      <MockText>{title}</MockText>
      {subtitle ? <MockText>{subtitle}</MockText> : null}
      {children}
    </MockView>
  );
});

jest.mock('../src/components/GroupContainer', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/ModuleRow', () => 'ModuleRow');
jest.mock('../src/components/SectionEyebrow', () => 'SectionEyebrow');
jest.mock('../src/components/AppSwitch', () => 'AppSwitch');
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

function render(mode: string, strobeFrequencyHz = 7) {
  mockStore = {
    ...mockStore,
    flashlightMode: mode,
    strobeFrequencyHz,
  };

  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<FlashlightScreen />);
  });
  return tree;
}

describe('FlashlightScreen header subtitle', () => {
  test.each([
    [FlashlightModes.OFF, 'Off'],
    [FlashlightModes.ON, 'Light on'],
    [FlashlightModes.SOS, 'SOS signalling'],
  ])('shows %s mode summary', (mode, expected) => {
    const tree = render(mode);
    const texts = tree.root.findAllByType(Text);

    expect(texts.map((node) => node.props.children)).toContain(expected);
  });

  test('shows strobe frequency in the subtitle', () => {
    const tree = render(FlashlightModes.STROBE, 11);
    const texts = tree.root.findAllByType(Text);

    expect(texts.map((node) => node.props.children)).toContain(
      'Strobe at 11 Hz',
    );
  });
});
