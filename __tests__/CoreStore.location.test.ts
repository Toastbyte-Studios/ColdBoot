import Geolocation from 'react-native-geolocation-service';
import { CoreStore, LOCATION_PERMISSION_DENIED } from '../src/stores/CoreStore';

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

  test('normalizes a GPS permission-denied error', async () => {
    geolocation.getCurrentPosition.mockImplementationOnce((_success, error) => {
      if (!error) throw new Error('missing geolocation error callback');
      error({ code: 1, message: 'Location permission denied' });
    });
    const store = new CoreStore();

    store.startDeviceStatusMonitoring();
    await flushPromises();

    expect(store.locationError).toBe(LOCATION_PERMISSION_DENIED);
    // Denied is final: a second, full-accuracy attempt would only re-prompt.
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    store.stopDeviceStatusMonitoring();
  });

  describe('fix accuracy', () => {
    const optionsOfCall = (index: number) =>
      geolocation.getCurrentPosition.mock.calls[index][2];

    test('the routine poll asks for a low-power fix and accepts a cached one', async () => {
      const store = new CoreStore();

      store.startDeviceStatusMonitoring();
      await flushPromises();

      expect(optionsOfCall(0)).toMatchObject({
        enableHighAccuracy: false,
        maximumAge: store.gpsIntervalMs,
      });
      store.stopDeviceStatusMonitoring();
    });

    test('falls back to full accuracy when a low-power fix fails', async () => {
      geolocation.getCurrentPosition.mockImplementationOnce(
        (_success, error) => {
          if (!error) throw new Error('missing geolocation error callback');
          error({ code: 2, message: 'Position unavailable' });
        },
      );
      const store = new CoreStore();

      store.startDeviceStatusMonitoring();
      await flushPromises();

      expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(optionsOfCall(1)).toMatchObject({ enableHighAccuracy: true });
      expect(store.lastFix).not.toBeNull();
      expect(store.locationError).toBeNull();
      store.stopDeviceStatusMonitoring();
    });

    test('reports the error when the full-accuracy retry fails too', async () => {
      geolocation.getCurrentPosition
        .mockImplementationOnce((_success, error) => {
          error?.({ code: 3, message: 'Timed out' });
        })
        .mockImplementationOnce((_success, error) => {
          error?.({ code: 3, message: 'Timed out' });
        });
      const store = new CoreStore();

      store.startDeviceStatusMonitoring();
      await flushPromises();

      expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(store.locationError).toBe('Timed out');
      store.stopDeviceStatusMonitoring();
    });

    test('takes full-accuracy fixes while a screen has asked for them', async () => {
      const store = new CoreStore();
      store.startDeviceStatusMonitoring();
      await flushPromises();
      geolocation.getCurrentPosition.mockClear();

      const release = store.retainPreciseGps();

      // One straight away, so the screen doesn't open on a coarse fix.
      expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(optionsOfCall(0)).toMatchObject({ enableHighAccuracy: true });

      // A second screen asking does not take another fix.
      const releaseSecond = store.retainPreciseGps();
      expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);

      // Still precise until every holder has let go, and releasing twice
      // doesn't count twice.
      release();
      release();
      store.setGpsIntervalMs(store.gpsIntervalMs / 2);
      expect(optionsOfCall(1)).toMatchObject({ enableHighAccuracy: true });

      releaseSecond();
      store.setGpsIntervalMs(store.gpsIntervalMs / 2);
      expect(optionsOfCall(2)).toMatchObject({ enableHighAccuracy: false });

      store.stopDeviceStatusMonitoring();
    });

    test('asking for precision before polling has started takes no fix', () => {
      const store = new CoreStore();

      const release = store.retainPreciseGps();

      expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
      release();
    });
  });
});
