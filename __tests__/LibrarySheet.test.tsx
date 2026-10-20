import React from 'react';
import { BackHandler, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import LibrarySheet from '../src/screens/Map/components/LibrarySheet';

let mockIsFocused = true;

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => {
  const ReactHooks = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) =>
      ReactHooks.useEffect(
        () => (mockIsFocused ? callback() : undefined),
        [callback],
      ),
  };
});

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
  // By label: the new-waypoint form has a segmented control of its own.
  const control = tree.root.find(
    (node) =>
      Array.isArray(node.props.values) &&
      'selectedIndex' in node.props &&
      node.props.accessibilityLabel ===
        'Show waypoints, tracks or offline maps',
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
  beforeEach(() => {
    mockIsFocused = true;
  });

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

  it('shows only the tab selector in its header', async () => {
    const tree = await render({ isOpen: true });
    const labels = tree.root
      .findAll((node) => typeof node.props.accessibilityLabel === 'string')
      .map((node) => node.props.accessibilityLabel);

    expect(labels).not.toContain('Close library');
    expect(labels).not.toContain('Add waypoint');
    expect(labels).not.toContain('Download an offline area');
  });

  it('opens straight into the new-waypoint form', async () => {
    const tree = await render({ isOpen: true, openTab: 'new-waypoint' });

    expect(selectedTab(tree)).toBe('Waypoints');
    tree.root.findByProps({ accessibilityLabel: 'Save waypoint' });
  });

  it('reopens the form when the same target is asked for again', async () => {
    const tree = await render({
      isOpen: true,
      openTab: 'new-waypoint',
      openRequestId: 1,
    });
    await ReactTestRenderer.act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: 'Cancel adding waypoint' })
        .props.onPress();
    });
    expect(
      tree.root.findAllByProps({ accessibilityLabel: 'Save waypoint' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      tree.update(
        <LibrarySheet
          {...baseProps}
          isOpen
          openTab="new-waypoint"
          openRequestId={2}
        />,
      );
    });

    tree.root.findByProps({ accessibilityLabel: 'Save waypoint' });
  });

  it('closes on Android back while open', async () => {
    const onClose = jest.fn();
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    await render({ isOpen: true, onClose });

    const handler = addListener.mock.calls.at(-1)?.[1] as () => boolean;
    let handled = false;
    await ReactTestRenderer.act(async () => {
      handled = handler();
    });

    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalled();
    addListener.mockRestore();
  });

  it('removes the Android back handler when the route loses focus', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    const tree = await render({ isOpen: true });
    const subscription = addListener.mock.results.at(-1)?.value;
    const remove = jest.spyOn(subscription, 'remove');

    mockIsFocused = false;
    await ReactTestRenderer.act(async () => {
      tree.update(<LibrarySheet {...baseProps} isOpen onClose={jest.fn()} />);
    });

    expect(remove).toHaveBeenCalled();
    addListener.mockRestore();
  });

  it('closes on the screen reader escape gesture', async () => {
    const onClose = jest.fn();
    const tree = await render({ isOpen: true, onClose });
    const sheet = tree.root.find(
      (node) =>
        Array.isArray(node.props.accessibilityActions) &&
        typeof node.props.onAccessibilityAction === 'function' &&
        typeof node.props.onAccessibilityEscape === 'function',
    );

    expect(sheet.props.accessibilityActions).toEqual([
      { name: 'escape', label: 'Close library' },
    ]);
    await ReactTestRenderer.act(async () => {
      sheet.props.onAccessibilityEscape();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
