import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import LibrarySheet from '../src/screens/Map/components/LibrarySheet';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

// ScaledText reads the settings store through the stores barrel, which
// would load every native module the app uses.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/stores/StoreContext', () => ({
  useSettingsStore: () => ({ measurementSystem: 'imperial' }),
}));

// The Maps tab has its own suite; here it only needs to show it was chosen.
jest.mock('../src/screens/Map/components/LibrarySheet/MapsTab', () => {
  const { Text: MockText } = require('react-native');
  return () => <MockText>maps-tab</MockText>;
});

const baseProps = {
  waypoints: [],
  tracks: [],
  currentCoords: null,
  onClose: jest.fn(),
  onNavigate: jest.fn(),
  onDelete: jest.fn(),
  onAddFromLocation: jest.fn(),
  onAddManual: jest.fn(),
  onViewRegion: jest.fn(),
  onDownloadArea: jest.fn(),
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((node) => node.props.children);

/** The tab the segmented control shows as selected. */
const selectedTab = (tree: ReactTestRenderer.ReactTestRenderer) => {
  const control = tree.root.find(
    (node) => Array.isArray(node.props.values) && 'selectedIndex' in node.props,
  );
  return control.props.values[control.props.selectedIndex];
};

async function render(
  props: Partial<React.ComponentProps<typeof LibrarySheet>>,
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <LibrarySheet {...baseProps} isOpen={false} {...props} />,
    );
  });
  return tree;
}

describe('LibrarySheet', () => {
  it('offers waypoints, tracks and maps', async () => {
    const tree = await render({ isOpen: true });
    const control = tree.root.find((node) => Array.isArray(node.props.values));

    expect(control.props.values).toEqual(['Waypoints', 'Tracks', 'Maps']);
    expect(selectedTab(tree)).toBe('Waypoints');
  });

  it('opens on the tab it is asked for', async () => {
    const tree = await render({ isOpen: true, openTab: 'maps' });

    expect(selectedTab(tree)).toBe('Maps');
    expect(texts(tree)).toContain('maps-tab');
  });

  it('switches tab when asked while already open', async () => {
    const tree = await render({ isOpen: true });
    expect(selectedTab(tree)).toBe('Waypoints');

    await ReactTestRenderer.act(async () => {
      tree.update(<LibrarySheet {...baseProps} isOpen openTab="maps" />);
    });

    expect(selectedTab(tree)).toBe('Maps');
  });

  it('keeps the last tab when opened without one', async () => {
    const tree = await render({ isOpen: true, openTab: 'tracks' });
    expect(selectedTab(tree)).toBe('Tracks');

    await ReactTestRenderer.act(async () => {
      tree.update(<LibrarySheet {...baseProps} isOpen={false} />);
    });
    await ReactTestRenderer.act(async () => {
      tree.update(<LibrarySheet {...baseProps} isOpen />);
    });

    expect(selectedTab(tree)).toBe('Tracks');
  });
});
