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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => false,
    goBack: jest.fn(),
    navigate: jest.fn(),
    setParams: jest.fn(),
  }),
  useRoute: () => ({ params: undefined }),
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

jest.mock('../src/stores/StoreContext', () => ({
  useWaypointStore: () => ({
    waypoints: [],
    activeWaypointId: null,
    addWaypoint: jest.fn(),
  }),
  useTrackStore: () => ({ tracks: [] }),
  useSettingsStore: () => ({ measurementSystem: 'imperial' }),
  useOfflineDownloadStore: () => ({ state: 'inactive' }),
  useOfflineMapLibraryStore: () => ({ load: jest.fn(() => Promise.resolve()) }),
  useDevToolsStore: () => ({ simulatedOffline: false }),
}));

// The sheet has its own tests; here it only needs to report whether it's open.
jest.mock('../src/screens/Map/components/LibrarySheet', () => {
  const { View: MockView } = require('react-native');
  return ({ isOpen }: { isOpen: boolean }) => (
    <MockView
      testID="library-sheet"
      accessibilityState={{ expanded: isOpen }}
    />
  );
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

const sheetIsOpen = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByProps({ testID: 'library-sheet' }).props.accessibilityState
    .expanded;

describe('MapScreen toolbar', () => {
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
});
