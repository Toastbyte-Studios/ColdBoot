import { useCurrentPosition } from '@maplibre/maplibre-react-native';
import React from 'react';
import { ScrollView } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { boundsFromRadius } from '../src/navigation/utils/boundsFromRadius';
import DownloadConfirmScreen, {
  type DownloadAreaParams,
} from '../src/screens/Map/components/offline/DownloadConfirmScreen';
import { createOfflineRegionWithSmartName } from '../src/screens/Map/components/offline/offlinePackNaming';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

// ScaledText reads the settings store through the stores barrel, which
// would load every native module the app uses.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

let mockMeasurementSystem: 'imperial' | 'metric' = 'imperial';
jest.mock('../src/stores', () => ({
  useSettingsStore: () => ({
    highDetailOffline: false,
    setHighDetailOffline: jest.fn(),
    measurementSystem: mockMeasurementSystem,
  }),
}));

const mockDownloadStore = {
  start: jest.fn(),
  handleProgress: jest.fn(),
  handleError: jest.fn(),
};
jest.mock('../src/stores/StoreContext', () => ({
  useOfflineDownloadStore: () => mockDownloadStore,
}));

jest.mock('../src/screens/Map/components/offline/offlinePackNaming', () => ({
  createOfflineRegionWithSmartName: jest.fn(() =>
    Promise.resolve({ id: 'pack-new' }),
  ),
}));

// One object for every render, as the screen keys effects on it.
const VEGAS = {
  coords: { latitude: 36.1405, longitude: -115.0677, altitude: 536 },
  timestamp: 0,
};

// Unmounted after each test: the screen's GPS retry timer (15 s) would
// otherwise outlive it and fire into whichever suite runs next.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function renderScreen(
  position: typeof VEGAS | null,
  params: DownloadAreaParams = {},
) {
  (useCurrentPosition as jest.Mock).mockReturnValue(position);
  const onDismiss = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <DownloadConfirmScreen {...params} onDismiss={onDismiss} />,
    );
  });
  mounted.push(tree);
  return { tree, onDismiss };
}

const areaControl = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find(
    (node) =>
      Array.isArray(node.props.values) &&
      node.props.accessibilityLabel === 'Area to download',
  );

async function chooseOnMap(tree: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {
    areaControl(tree).props.onChange({
      nativeEvent: { selectedSegmentIndex: 1 },
    });
  });
}

const downloadButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      node.props.accessibilityLabel === 'Start download' &&
      typeof node.props.onPress === 'function',
  )[0];

async function pressDownload(tree: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {
    await downloadButton(tree).props.onPress();
  });
}

const previewMap = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByProps({ testID: 'map-view' });

const allText = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => typeof node.props.children === 'string')
    .map((node) => node.props.children)
    .join(' ');

describe('DownloadConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeasurementSystem = 'imperial';
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      mounted.splice(0).forEach((tree) => tree.unmount());
    });
  });

  it('downloads the area around the user by default', async () => {
    const { tree, onDismiss } = await renderScreen(VEGAS);

    expect(areaControl(tree).props.selectedIndex).toBe(0);
    await pressDownload(tree);

    expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
      expect.objectContaining({
        centerLat: 36.1405,
        centerLng: -115.0677,
        radiusMiles: 50,
      }),
    );
    expect(mockDownloadStore.start).toHaveBeenCalledWith({ id: 'pack-new' });
    expect(onDismiss).toHaveBeenCalled();
  }, 10_000);

  it('downloads an area chosen on the map, far from the user', async () => {
    const { tree } = await renderScreen(VEGAS);
    await chooseOnMap(tree);

    expect(allText(tree)).toContain('around the crosshair');

    // Pan north to the hike, ~170 miles from Vegas.
    await ReactTestRenderer.act(async () => {
      previewMap(tree).props.onRegionDidChange({
        nativeEvent: { center: [-115.37, 38.62] },
      });
    });
    await pressDownload(tree);

    expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
      expect.objectContaining({
        centerLat: 38.62,
        centerLng: -115.37,
        radiusMiles: 50,
      }),
    );
    const { bounds } = (createOfflineRegionWithSmartName as jest.Mock).mock
      .calls[0][0];
    const [west, south, east, north] = bounds;
    expect(south).toBeLessThan(38.62);
    expect(north).toBeGreaterThan(38.62);
    expect(west).toBeLessThan(-115.37);
    expect(east).toBeGreaterThan(-115.37);
  });

  it('starts choosing from the user, fitted to the area', async () => {
    const { tree } = await renderScreen(VEGAS);
    await chooseOnMap(tree);

    const camera = tree.root.find(
      (node) => node.props.initialViewState !== undefined,
    );
    const { bounds, padding } = camera.props.initialViewState;
    const [west, south, east, north] = bounds;
    expect((south + north) / 2).toBeCloseTo(36.1405, 3);
    expect((west + east) / 2).toBeCloseTo(-115.0677, 3);
    expect(padding).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
  });

  it('lets the user choose an area without a GPS fix', async () => {
    const { tree } = await renderScreen(null);

    expect(downloadButton(tree).props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => {
      tree.root
        .findAll(
          (node) =>
            node.props.children === 'Choose on map instead' ||
            node.props.label === 'Choose on map instead',
        )
        .find((node) => typeof node.props.onPress === 'function')
        ?.props.onPress();
    });

    expect(areaControl(tree).props.selectedIndex).toBe(1);
    expect(downloadButton(tree).props.disabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      previewMap(tree).props.onRegionDidChange({
        nativeEvent: { center: [-115.37, 38.62] },
      });
    });
    await pressDownload(tree);

    expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
      expect.objectContaining({ centerLat: 38.62, centerLng: -115.37 }),
    );
  });

  it('keeps the page and modal still while the map is panned', async () => {
    const { tree } = await renderScreen(VEGAS);
    expect(mockSetOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await chooseOnMap(tree);
    expect(mockSetOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    const container = tree.root.find(
      (node) => typeof node.props.onTouchStart === 'function',
    );
    const scroll = () => tree.root.findByType(ScrollView);

    await ReactTestRenderer.act(async () => {
      container.props.onTouchStart();
    });
    expect(scroll().props.scrollEnabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      container.props.onTouchEnd({ nativeEvent: { touches: [{}] } });
    });
    expect(scroll().props.scrollEnabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      container.props.onTouchEnd({ nativeEvent: { touches: [] } });
    });
    expect(scroll().props.scrollEnabled).toBe(true);
  });

  it('restores the chosen center and radius when returning to custom mode', async () => {
    const { tree } = await renderScreen(VEGAS);
    await chooseOnMap(tree);
    await ReactTestRenderer.act(async () => {
      previewMap(tree).props.onRegionDidChange({
        nativeEvent: { center: [-115.37, 38.62] },
      });
    });

    await ReactTestRenderer.act(async () => {
      tree.root
        .find(
          (node) =>
            Array.isArray(node.props.values) &&
            node.props.accessibilityLabel === 'Area size, as a radius',
        )
        .props.onChange({ nativeEvent: { selectedSegmentIndex: 1 } });
    });
    await ReactTestRenderer.act(async () => {
      areaControl(tree).props.onChange({
        nativeEvent: { selectedSegmentIndex: 0 },
      });
    });
    await ReactTestRenderer.act(async () => {
      areaControl(tree).props.onChange({
        nativeEvent: { selectedSegmentIndex: 1 },
      });
    });

    const camera = tree.root.find(
      (node) => node.props.initialViewState !== undefined,
    );
    expect(camera.props.initialViewState).toEqual({
      bounds: boundsFromRadius({ latitude: 38.62, longitude: -115.37 }, 25),
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
    });
  });

  it('goes back to the area around the user', async () => {
    const { tree } = await renderScreen(VEGAS);
    await chooseOnMap(tree);
    await ReactTestRenderer.act(async () => {
      previewMap(tree).props.onRegionDidChange({
        nativeEvent: { center: [-115.37, 38.62] },
      });
    });

    await ReactTestRenderer.act(async () => {
      areaControl(tree).props.onChange({
        nativeEvent: { selectedSegmentIndex: 0 },
      });
    });
    await pressDownload(tree);

    expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
      expect.objectContaining({ centerLat: 36.1405, centerLng: -115.0677 }),
    );
  });

  describe('area size', () => {
    const sizeControl = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.find(
        (node) =>
          Array.isArray(node.props.values) &&
          node.props.accessibilityLabel === 'Area size, as a radius',
      );

    async function chooseSize(
      tree: ReactTestRenderer.ReactTestRenderer,
      index: number,
    ) {
      await ReactTestRenderer.act(async () => {
        sizeControl(tree).props.onChange({
          nativeEvent: { selectedSegmentIndex: index },
        });
      });
    }

    const estimate = (tree: ReactTestRenderer.ReactTestRenderer) => {
      const label = tree.root.find(
        (node) => node.props.children === 'Estimated size',
      );
      const row = label.parent?.parent;
      return row
        ?.findAll((node) => typeof node.props.children === 'string')
        .map((node) => node.props.children)
        .find((text: string) => text !== 'Estimated size');
    };

    it('offers 10, 25 and 50 miles, starting at 50', async () => {
      const { tree } = await renderScreen(VEGAS);

      expect(sizeControl(tree).props.values).toEqual([
        '10 mi',
        '25 mi',
        '50 mi',
      ]);
      expect(sizeControl(tree).props.selectedIndex).toBe(2);
    });

    it('labels sizes in kilometres for metric users', async () => {
      mockMeasurementSystem = 'metric';
      const { tree } = await renderScreen(VEGAS);

      expect(sizeControl(tree).props.values).toEqual([
        '16 km',
        '40 km',
        '80 km',
      ]);
    });

    it('downloads a smaller area, for less storage', async () => {
      const { tree } = await renderScreen(VEGAS);
      const fullSize = estimate(tree);

      await chooseSize(tree, 0);

      expect(allText(tree)).toContain('~10 mi radius');
      expect(estimate(tree)).not.toBe(fullSize);
      await pressDownload(tree);

      const args = (createOfflineRegionWithSmartName as jest.Mock).mock
        .calls[0][0];
      expect(args.radiusMiles).toBe(10);
      const [, south, , north] = args.bounds;
      // ~10 miles each way is ~0.29° of latitude.
      expect(north - south).toBeCloseTo(0.29, 1);
    });

    it('keeps the size when choosing on the map', async () => {
      const { tree } = await renderScreen(VEGAS);
      await chooseSize(tree, 1);
      await chooseOnMap(tree);
      await ReactTestRenderer.act(async () => {
        previewMap(tree).props.onRegionDidChange({
          nativeEvent: { center: [-115.37, 38.62] },
        });
      });

      await pressDownload(tree);

      expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
        expect.objectContaining({
          centerLat: 38.62,
          centerLng: -115.37,
          radiusMiles: 25,
        }),
      );
    });
  });

  describe('starting points', () => {
    const HIKE = { latitude: 38.62, longitude: -115.37 };

    const startView = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.find((node) => node.props.initialViewState !== undefined).props
        .initialViewState;

    it('opens on a waypoint, already choosing on the map', async () => {
      const { tree } = await renderScreen(VEGAS, {
        center: HIKE,
        startMode: 'custom',
      });

      expect(areaControl(tree).props.selectedIndex).toBe(1);
      const [west, south, east, north] = startView(tree).bounds;
      expect((south + north) / 2).toBeCloseTo(HIKE.latitude, 3);
      expect((west + east) / 2).toBeCloseTo(HIKE.longitude, 3);

      await pressDownload(tree);
      expect(createOfflineRegionWithSmartName).toHaveBeenCalledWith(
        expect.objectContaining({ centerLat: 38.62, centerLng: -115.37 }),
      );
    });

    it('opens on a waypoint even without a GPS fix', async () => {
      const { tree } = await renderScreen(null, {
        center: HIKE,
        startMode: 'custom',
      });

      expect(downloadButton(tree).props.disabled).toBe(false);
    });

    it("starts choosing at the main map's view, not the user", async () => {
      const { tree } = await renderScreen(VEGAS, { center: HIKE });

      // Still defaults to around the user…
      expect(areaControl(tree).props.selectedIndex).toBe(0);
      await chooseOnMap(tree);

      // …but choosing starts where the main map was looking.
      const [west, south, east, north] = startView(tree).bounds;
      expect((south + north) / 2).toBeCloseTo(HIKE.latitude, 3);
      expect((west + east) / 2).toBeCloseTo(HIKE.longitude, 3);
    });
  });
});
