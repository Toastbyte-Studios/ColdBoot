import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SolarCycleCard from '../src/screens/HomeScreen/components/SolarCycleCard';
import { LIGHT_COLORS } from '../src/theme/colors';

const mockColors = LIGHT_COLORS;

jest.mock('mobx-react-lite', () => ({
  observer: (component: unknown) => component,
}));

jest.mock('../src/stores/StoreContext', () => ({
  useBarometerStore: jest.fn(() => ({
    currentPressure: null,
    history: [],
  })),
  useCoreStore: jest.fn(() => ({
    lastFix: null,
    locationError: null,
  })),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => mockColors),
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/components/Chip', () => 'Chip');

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
}));

function render() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<SolarCycleCard />);
  });
  return tree;
}

describe('SolarCycleCard', () => {
  test('renders no-fix state while still showing pressure and moon stats', () => {
    const tree = render();
    const { Text } = require('react-native');
    const allText = tree.root
      .findAllByType(Text)
      .map((node) =>
        Array.isArray(node.props.children)
          ? node.props.children.join('')
          : String(node.props.children),
      )
      .join(' ');

    expect(allText).toContain('Waiting for GPS…');
    expect(allText).toContain('PRESSURE');
    expect(allText).toContain('MOON');
    expect(allText).toContain('No fix');
    ReactTestRenderer.act(() => tree.unmount());
  });
});
