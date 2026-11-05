import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SunTimeScreen from '../src/screens/SunTime/SunTimeScreen';

const mockCore = {
  lastFix: { coords: { latitude: 34.0522, longitude: -118.2437 } },
};

jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => mockCore,
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/GroupContainer', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function render() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<SunTimeScreen />);
    mounted.push(tree);
  });
  return tree;
}

/** The chart's container: the only element with an onLayout handler. */
const chartOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find((node) => typeof node.props.onLayout === 'function');

const svgWidth = (tree: ReactTestRenderer.ReactTestRenderer) =>
  chartOf(tree).findAll(
    (node) => node.props.width !== undefined && node.props.height === 132,
  )[0]?.props.width;

describe('SunTimeScreen daylight chart', () => {
  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      mounted.splice(0).forEach((tree) => tree.unmount());
    });
    jest.useRealTimers();
  });

  it('draws the arc before any layout event arrives', async () => {
    const tree = await render();

    // No onLayout has fired: the chart must still render from the estimate.
    expect(svgWidth(tree)).toBeGreaterThan(0);
  });

  it('switches to the measured width, and ignores a zero measurement', async () => {
    const tree = await render();
    const layout = (width: number) =>
      ReactTestRenderer.act(() => {
        chartOf(tree).props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width, height: 132 } },
        });
      });

    await layout(300.4);
    expect(svgWidth(tree)).toBe(300);

    await layout(0);
    expect(svgWidth(tree)).toBe(300);
  });
});
