import {
  LocationManager,
  useCurrentPosition,
} from '@maplibre/maplibre-react-native';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MapScreen from '../src/screens/Map/MapScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-compass-heading', () => ({
  start: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

// Route params per test; Settings → Offline maps sends { library: 'maps' }.
// Like the real navigator, the navigation object is stable across renders
// and setParams merges into the route's params.
let mockRouteParams: Record<string, unknown> | undefined;
let mockLibraryProps:
  | {
      onViewRegion?: (region: {
        center: { latitude: number; longitude: number };
        radiusMiles: number;
      }) => void;
    }
  | undefined;
const mockSetParams = jest.fn((next: Record<string, unknown>) => {
  mockRouteParams = { ...mockRouteParams, ...next };
});
const mockNavigation = {
  canGoBack: () => false,
  goBack: jest.fn(),
  navigate: jest.fn(),
  setParams: mockSetParams,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../src/navigation/navigationRef', () => ({
  navigationRef: { current: { navigate: jest.fn() } },
}));

jest.mock('../src/navigation/NavigationHistoryContext', () => ({
  useGestureNavigation: () => ({ setDisableGestureNavigation: jest.fn() }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

// ScaledText reads the settings store through the stores barrel, which
// would load every native module the app uses.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/utils/reverseGeocode', () => ({
  reverseGeocode: jest.fn(() => Promise.resolve(null)),
}));

const mockWaypointStore = {
  waypoints: [],
  activeWaypointId: null,
  addWaypoint: jest.fn(() => Promise.resolve()),
};

jest.mock('../src/stores/StoreContext', () => ({
  useWaypointStore: () => mockWaypointStore,
  useTrackStore: () => ({ tracks: [] }),
  useSettingsStore: () => ({ measurementSystem: 'imperial' }),
  useOfflineDownloadStore: () => ({ state: 'inactive' }),
  useOfflineMapLibraryStore: () => ({ load: jest.fn(() => Promise.resolve()) }),
  useDevToolsStore: () => ({ simulatedOffline: false }),
}));

// The sheet has its own tests; here it only reports whether it's open and
// which tab it was asked to open on.
jest.mock('../src/screens/Map/components/LibrarySheet', () => {
  const { View: MockView } = require('react-native');
  return ({
    isOpen,
    openTab,
    ...props
  }: {
    isOpen: boolean;
    openTab?: string;
    onViewRegion?: (region: {
      center: { latitude: number; longitude: number };
      radiusMiles: number;
    }) => void;
  }) => {
    mockLibraryProps = props;
    return (
      <MockView
        testID="library-sheet"
        accessibilityState={{ expanded: isOpen }}
        accessibilityValue={{ text: openTab ?? 'last' }}
      />
    );
  };
});

jest.mock(
  '../src/screens/Map/components/offline/DownloadProgressChip',
  () => () => null,
);
jest.mock('../src/screens/Map/components/CompassRing', () => () => null);
jest.mock('../src/screens/Map/components/CompassDataPanel', () => () => null);

const findButton = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];

// One object for every render: the shared mock builds a new position each
// call, and MapScreen's position effect would re-render forever on it.
const STABLE_POSITION = {
  coords: { latitude: 36.1405, longitude: -115.0677, altitude: 536 },
  timestamp: 0,
};

async function renderScreen(permission: boolean) {
  (LocationManager.requestPermissions as jest.Mock).mockResolvedValue(
    permission,
  );
  (useCurrentPosition as jest.Mock).mockReturnValue(
    permission ? STABLE_POSITION : null,
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<MapScreen />);
  });
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });
  return tree;
}

const sheet = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByProps({ testID: 'library-sheet' }).props;
const sheetIsOpen = (tree: ReactTestRenderer.ReactTestRenderer) =>
  sheet(tree).accessibilityState.expanded;
const sheetTab = (tree: ReactTestRenderer.ReactTestRenderer) =>
  sheet(tree).accessibilityValue.text;

describe('MapScreen Library', () => {
  beforeEach(() => {
    mockRouteParams = undefined;
    mockLibraryProps = undefined;
    mockSetParams.mockClear();
  });

  afterEach(() => {
    (LocationManager.requestPermissions as jest.Mock).mockResolvedValue(true);
  });

  it('has one Library button in place of waypoints, download and map library', async () => {
    const tree = await renderScreen(true);

    expect(findButton(tree, 'Open library')).toBeDefined();
    expect(findButton(tree, 'Download offline area')).toBeUndefined();
    expect(findButton(tree, 'Map Library')).toBeUndefined();
  });

  it('opens the Library without location access', async () => {
    const tree = await renderScreen(false);
    const library = findButton(tree, 'Open library');

    expect(library.props.disabled).toBeFalsy();
    expect(sheetIsOpen(tree)).toBe(false);

    await ReactTestRenderer.act(async () => {
      library.props.onPress();
    });

    expect(sheetIsOpen(tree)).toBe(true);
  });

  it('still needs location access to record or centre on the user', async () => {
    const tree = await renderScreen(false);

    expect(findButton(tree, 'Start recording').props.disabled).toBe(true);
    expect(findButton(tree, 'Center map on my location').props.disabled).toBe(
      true,
    );
  });

  it('opens on the Maps tab when linked from Settings', async () => {
    mockRouteParams = { library: 'maps' };

    const tree = await renderScreen(true);

    expect(sheetIsOpen(tree)).toBe(true);
    expect(sheetTab(tree)).toBe('maps');
    // The param is consumed so returning to the screen doesn't reopen it.
    expect(mockSetParams).toHaveBeenCalledWith({ library: undefined });
  });

  it('queues a selected map region until the map is ready', async () => {
    const tree = await renderScreen(true);
    const region = {
      center: { latitude: 36.14, longitude: -115.07 },
      radiusMiles: 50,
    };

    await ReactTestRenderer.act(async () => {
      mockLibraryProps?.onViewRegion?.(region);
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      center: region.center,
      radiusMiles: region.radiusMiles,
    });
    expect(mockRouteParams).toEqual({
      center: region.center,
      radiusMiles: region.radiusMiles,
    });

    await ReactTestRenderer.act(async () => {
      tree.update(<MapScreen />);
    });
    expect(mockSetParams).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      tree.root
        .findByProps({ testID: 'map-view' })
        .props.onDidFinishLoadingMap();
    });

    expect(mockSetParams).toHaveBeenLastCalledWith({
      center: undefined,
      radiusMiles: undefined,
    });
  });

  it('keeps the last tab when opened from the toolbar', async () => {
    mockRouteParams = { library: 'maps' };
    const tree = await renderScreen(true);

    await ReactTestRenderer.act(async () => {
      findButton(tree, 'Open library').props.onPress();
    });

    expect(sheetTab(tree)).toBe('last');
  });

  it('opens on Waypoints after a long-press drops one', async () => {
    const tree = await renderScreen(true);
    const map = tree.root.findByProps({ testID: 'map-view' });

    await ReactTestRenderer.act(async () => {
      await map.props.onLongPress({
        nativeEvent: { lngLat: [-115.07, 36.14] },
      });
    });

    expect(mockWaypointStore.addWaypoint).toHaveBeenCalledWith(
      'Waypoint 1',
      36.14,
      -115.07,
    );
    expect(sheetIsOpen(tree)).toBe(true);
    expect(sheetTab(tree)).toBe('waypoints');
  });
});
