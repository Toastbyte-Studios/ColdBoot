import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import DeviceStatusScreen from '../src/screens/DeviceStatus/DeviceStatusScreen';

const mockNavigate = jest.fn();
const mockOpenSettings = jest.fn();
const LA = { latitude: 34.0522, longitude: -118.2437 };
const GB = 1024 ** 3;

const mockStores = {
  core: {
    lastFix: {
      coords: { ...LA, accuracy: 6, altitude: 89, heading: null, speed: null },
      timestamp: Date.now() - 2 * 60_000,
    },
    locationError: null as string | null,
    batteryLevel: 0.25,
    isCharging: false,
    lowPowerMode: false,
    batteryEstimateMinutes: 130,
    retainPreciseGps: jest.fn(() => jest.fn()),
    batteryTemperatureC: -2 as number | null,
    storageFree: 40 * GB,
    storageTotal: 128 * GB,
    netInfo: {
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    },
  },
  settings: { measurementSystem: 'metric', lastBackupAt: null },
  notes: { notes: [] },
  maps: {
    hasLoaded: true,
    loading: false,
    load: jest.fn(() => Promise.resolve()),
    packs: [
      {
        id: 'p1',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'complete', completedResourceSize: 300 * 1024 ** 2 },
      },
    ],
    loadFailed: false,
    totalBytes: 300 * 1024 ** 2,
    displayName: () => 'Downtown',
  },
  barometer: { available: false, currentPressure: null, loading: false },
  plan: {
    contacts: [{ id: 'c1' }],
    rallyPoints: [] as { id: string }[],
    communicationPlan: {
      whoCallsWhom: '',
      ifPhonesDown: '',
      outOfAreaContact: '',
      checkInSchedule: '',
      updatedAt: 0,
    },
  },
};

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // Runs the effect like useEffect: the screen under test is always focused.
  useFocusEffect: (effect: () => void | (() => void)) =>
    require('react').useEffect(effect, [effect]),
}));

jest.mock('../src/components/SettingsSheetContext', () => ({
  useSettingsSheet: () => ({ openSettings: mockOpenSettings }),
}));

jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => mockStores.core,
  useSettingsStore: () => mockStores.settings,
  useNotesStore: () => mockStores.notes,
  useOfflineMapLibraryStore: () => mockStores.maps,
  useBarometerStore: () => mockStores.barometer,
  useEmergencyPlanStore: () => mockStores.plan,
}));

jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

let mounted: ReactTestRenderer.ReactTestRenderer | null = null;

async function render() {
  await ReactTestRenderer.act(async () => {
    mounted = ReactTestRenderer.create(<DeviceStatusScreen />);
  });
  if (!mounted) throw new Error('render failed');
  return mounted;
}

/** Every accessibility label on screen: one per row, which is what's read. */
const labels = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => typeof node.props.accessibilityLabel === 'string')
    .map((node) => node.props.accessibilityLabel as string);

const button = (tree: ReactTestRenderer.ReactTestRenderer, title: string) =>
  tree.root.find(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(title) &&
      typeof node.props.onPress === 'function',
  );

describe('DeviceStatusScreen', () => {
  afterEach(async () => {
    // Unmounting stops the compass probe and the fix-age ticker; left
    // mounted, they would fire after the test environment is torn down.
    await ReactTestRenderer.act(async () => mounted?.unmount());
    mounted = null;
    jest.clearAllMocks();
  });

  it('renders every section with its readings', async () => {
    const tree = await render();
    const all = labels(tree).join('\n');

    // Readiness
    expect(all).toContain('Location access. Allowed');
    expect(all).toContain('Offline map here. Covered by Downtown');
    expect(all).toContain('Backup. Never backed up');
    expect(all).toContain('Emergency plan. Missing rally point, comms plan');
    // Location
    expect(all).toMatch(/Last fix\. 2 min ago/);
    expect(all).toContain('Accuracy. ±6 m. Good');
    expect(all).toContain('Coordinates. 34.05220° N, 118.24370° W');
    expect(all).toContain('Altitude. 89 m');
    // Battery: 25%, saver off, so the nudge shows
    expect(all).toContain('Time left. About 2 hr 10 min');
    expect(all).toContain(
      'Low Power Mode. Off. Turn on in Settings to stretch the battery',
    );
    // Android's battery temperature, when the platform reports one
    expect(all).toContain('Temperature. −2 °C. Too cold to charge');
    // Connectivity
    expect(all).toContain(
      'Network. Offline. Every ColdBoot tool works without a connection',
    );
    // Storage
    expect(all).toContain('Free space. 40');
    expect(all).toMatch(/Room for maps\. About \d+ more areas/);
    // Sensors
    expect(all).toContain('Barometer. Not on this device');
  });

  it('opens the right place from each readiness item', async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockStores.core.locationError = 'Location permission not granted';
    const tree = await render();

    await ReactTestRenderer.act(async () => {
      button(tree, 'Offline map here').props.onPress();
      button(tree, 'Backup').props.onPress();
      button(tree, 'Emergency plan').props.onPress();
      button(tree, 'Location access').props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('MapScreen', { library: 'maps' });
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('EmergencyPlan');
    expect(openSettingsSpy).toHaveBeenCalled();
    mockStores.core.locationError = null;
  });

  it('copes with nothing known yet', async () => {
    Object.assign(mockStores.core, {
      lastFix: null,
      batteryLevel: null,
      isCharging: null,
      lowPowerMode: null,
      batteryEstimateMinutes: null,
      batteryTemperatureC: null,
      storageFree: null,
      storageTotal: null,
      netInfo: null,
    });
    const tree = await render();
    const all = labels(tree).join('\n');

    expect(all).toContain('GPS. Waiting for fix');
    expect(all).toContain('Network. Checking…');
    expect(all).toContain('Free space. Unknown');
    expect(all).not.toContain('Temperature.');
  });

  it('does not treat a failed map read as an empty library', async () => {
    mockStores.maps.hasLoaded = true;
    mockStores.maps.loadFailed = true;
    mockStores.maps.packs = [];

    const tree = await render();
    const all = labels(tree).join('\n');

    expect(all).toContain('Offline map here. Could not check saved areas');
    expect(all).toContain('Offline maps. Unknown');
    expect(all).toContain('Room for maps. Unknown');
    expect(all).not.toContain('No areas downloaded');

    mockStores.maps.loadFailed = false;
    mockStores.maps.packs = [
      {
        id: 'p1',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'complete', completedResourceSize: 300 * 1024 ** 2 },
      },
    ];
  });

  it('does not count unfinished packs as offline coverage or map size samples', async () => {
    mockStores.maps.packs = [
      {
        id: 'partial',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'unknown', completedResourceSize: 1 },
      },
    ];
    mockStores.maps.totalBytes = 1;

    const tree = await render();
    const all = labels(tree).join('\n');

    expect(all).toContain('Offline map here. No areas downloaded');
    expect(all).toContain('Room for maps. No completed areas yet');

    mockStores.maps.packs = [
      {
        id: 'p1',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'complete', completedResourceSize: 300 * 1024 ** 2 },
      },
    ];
    mockStores.maps.totalBytes = 300 * 1024 ** 2;
  });

  it('estimates map capacity from completed packs only', async () => {
    mockStores.core.storageFree = 40 * GB;
    mockStores.maps.packs = [
      {
        id: 'complete',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'complete', completedResourceSize: 300 * 1024 ** 2 },
      },
      {
        id: 'partial',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'unknown', completedResourceSize: 1 },
      },
    ];
    mockStores.maps.totalBytes = 300 * 1024 ** 2 + 1;

    const tree = await render();

    expect(labels(tree).join('\n')).toContain(
      'Room for maps. About 102 more areas',
    );

    mockStores.maps.packs = [
      {
        id: 'p1',
        metadata: {
          centerLat: LA.latitude,
          centerLng: LA.longitude,
          radiusMiles: 5,
        },
        status: { state: 'complete', completedResourceSize: 300 * 1024 ** 2 },
      },
    ];
    mockStores.maps.totalBytes = 300 * 1024 ** 2;
    mockStores.core.storageFree = 40 * GB;
  });

  it('requires communication-plan content, not only a saved timestamp', async () => {
    mockStores.plan.rallyPoints = [{ id: 'r1' }];
    mockStores.plan.communicationPlan = {
      whoCallsWhom: '',
      ifPhonesDown: '   ',
      outOfAreaContact: '',
      checkInSchedule: '',
      updatedAt: Date.now(),
    };

    const tree = await render();
    expect(labels(tree).join('\n')).toContain(
      'Emergency plan. Missing comms plan',
    );

    mockStores.plan.rallyPoints = [];
    mockStores.plan.communicationPlan = {
      whoCallsWhom: '',
      ifPhonesDown: '',
      outOfAreaContact: '',
      checkInSchedule: '',
      updatedAt: 0,
    };
  });
});
