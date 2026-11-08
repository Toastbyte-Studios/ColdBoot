import { observable, runInAction } from 'mobx';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import SunTimeScreen, {
  SUN_RISE_DURATION_MS,
} from '../src/screens/SunTime/SunTimeScreen';
import { getSolarSnapshot } from '../src/utils/sunTimes';

const LA = { latitude: 34.0522, longitude: -118.2437 };
const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };

const mockCore = observable({
  lastFix: { coords: LA },
});
const renderedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

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

async function render() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<SunTimeScreen />);
    renderedTrees.push(tree);
  });
  return tree;
}

async function unmountRenderedTrees() {
  await ReactTestRenderer.act(async () => {
    renderedTrees.splice(0).forEach((tree) => tree.unmount());
  });
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
    await unmountRenderedTrees();
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

describe('SunTimeScreen sun rise animation', () => {
  // 10 AM in Los Angeles: the sun is part-way up its arc.
  const NOW = new Date('2026-11-05T18:00:00Z');
  const WIDTH = 300;
  const snapshot = getSolarSnapshot(LA.latitude, LA.longitude, NOW);
  if (!snapshot) throw new Error('Los Angeles always has a sunrise');
  const expectedX = snapshot.progress * WIDTH;

  /** x position of the sun's core (the r=7 circle). */
  const sunX = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.find((node) => node.props.r === 7 && node.props.cx !== undefined)
      .props.cx as number;

  async function renderMeasured() {
    const tree = await render();
    await ReactTestRenderer.act(async () => {
      chartOf(tree).props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 132 } },
      });
    });
    return tree;
  }

  const advance = (ms: number) =>
    ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(ms);
    });

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    runInAction(() => {
      mockCore.lastFix = { coords: LA };
    });
  });

  afterEach(async () => {
    await unmountRenderedTrees();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('climbs from the horizon to the current position', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const tree = await renderMeasured();

    expect(expectedX).toBeGreaterThan(0);
    expect(sunX(tree)).toBe(0);

    await advance(SUN_RISE_DURATION_MS / 3);
    expect(sunX(tree)).toBeGreaterThan(0);
    expect(sunX(tree)).toBeLessThan(expectedX);

    await advance(SUN_RISE_DURATION_MS);
    expect(sunX(tree)).toBeCloseTo(expectedX, 1);
  });

  it('places the sun without animating when Reduce Motion is on', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const tree = await renderMeasured();

    expect(sunX(tree)).toBeCloseTo(expectedX, 1);
  });

  it('does not restart when a new fix arrives mid-climb', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const tree = await renderMeasured();

    await advance(SUN_RISE_DURATION_MS / 2);
    const midway = sunX(tree);
    expect(midway).toBeGreaterThan(0);

    const updatedSnapshot = getSolarSnapshot(
      NEW_YORK.latitude,
      NEW_YORK.longitude,
      NOW,
    );
    if (!updatedSnapshot) throw new Error('New York always has a sunrise');
    await ReactTestRenderer.act(() => {
      runInAction(() => {
        mockCore.lastFix = { coords: NEW_YORK };
      });
    });
    expect(sunX(tree)).toBeGreaterThanOrEqual(midway);

    await advance(SUN_RISE_DURATION_MS / 14);
    expect(sunX(tree)).toBeGreaterThan(midway);

    await advance(SUN_RISE_DURATION_MS * 1.5);
    expect(sunX(tree)).toBeCloseTo(updatedSnapshot.progress * WIDTH, 1);
  });
});
