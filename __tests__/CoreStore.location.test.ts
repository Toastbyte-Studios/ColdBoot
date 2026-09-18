import Geolocation from 'react-native-geolocation-service';
import { CoreStore } from '../src/stores/CoreStore';

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success, _error, _options) => {
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
  }),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
}));

jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
  getPowerState: jest.fn(() =>
    Promise.resolve({ batteryState: 'unplugged', charging: false }),
  ),
  getTotalDiskCapacity: jest.fn(() => Promise.resolve(1024)),
  getFreeDiskStorage: jest.fn(() => Promise.resolve(512)),
}));

const mockNetUnsub = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => mockNetUnsub),
}));

const mockRemoveAppStateListener = jest.fn();
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: mockRemoveAppStateListener })),
  },
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn((permission: string) =>
      Promise.resolve(permission.endsWith('FINE_LOCATION')),
    ),
    request: jest.fn(() => Promise.resolve('granted')),
  },
}));

describe('CoreStore location permission flow', () => {
  const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
  const geolocation = Geolocation as jest.Mocked<typeof Geolocation>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts GPS polling on Android when permission is granted', async () => {
    const store = new CoreStore();

    store.startDeviceStatusMonitoring();
    await flushPromises();

    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(store.lastFix).not.toBeNull();

    store.stopDeviceStatusMonitoring();
  });
});
