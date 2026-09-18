import Geolocation from 'react-native-geolocation-service';
import {
  requestForegroundLocationPermission,
  type LocationPermissionResult,
} from '../src/utils/locationPermission';

jest.mock('react-native-geolocation-service');

jest.mock('react-native', () => ({
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
    check: jest.fn(),
    request: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

type ReactNativeMock = {
  Platform: { OS: 'ios' | 'android' };
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: string;
      ACCESS_COARSE_LOCATION: string;
    };
    RESULTS: {
      GRANTED: string;
      DENIED: string;
      NEVER_ASK_AGAIN: string;
    };
    check: jest.Mock<Promise<boolean>, [string]>;
    request: jest.Mock<Promise<string>, [string, object]>;
  };
};

describe('requestForegroundLocationPermission', () => {
  const { Platform, PermissionsAndroid } = jest.requireMock(
    'react-native',
  ) as ReactNativeMock;
  const geo = Geolocation as jest.Mocked<typeof Geolocation>;

  const expectResult = async (
    expected: LocationPermissionResult,
  ): Promise<void> => {
    await expect(requestForegroundLocationPermission()).resolves.toBe(expected);
  };

  beforeEach(() => {
    Platform.OS = 'ios';
    PermissionsAndroid.check.mockReset();
    PermissionsAndroid.request.mockReset();
    geo.requestAuthorization.mockReset();
  });

  test('returns granted on iOS when authorization is granted', async () => {
    geo.requestAuthorization.mockResolvedValue('granted');
    await expectResult('granted');
  });

  test('returns denied on iOS when authorization is denied', async () => {
    geo.requestAuthorization.mockResolvedValue('denied');
    await expectResult('denied');
  });

  test('returns granted on Android when fine permission is already granted', async () => {
    Platform.OS = 'android';
    PermissionsAndroid.check
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expectResult('granted');
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });

  test('returns granted on Android after prompting for fine location', async () => {
    Platform.OS = 'android';
    PermissionsAndroid.check
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    PermissionsAndroid.request.mockResolvedValue(
      PermissionsAndroid.RESULTS.GRANTED,
    );

    await expectResult('granted');
  });

  test('returns denied on Android when fine request is denied', async () => {
    Platform.OS = 'android';
    PermissionsAndroid.check
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    PermissionsAndroid.request.mockResolvedValue(
      PermissionsAndroid.RESULTS.DENIED,
    );

    await expectResult('denied');
  });

  test('returns denied on Android when fine request is never ask again', async () => {
    Platform.OS = 'android';
    PermissionsAndroid.check
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    PermissionsAndroid.request.mockResolvedValue(
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    );

    await expectResult('denied');
  });

  test('returns granted on Android when coarse permission is already granted', async () => {
    Platform.OS = 'android';
    PermissionsAndroid.check
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expectResult('granted');
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });

  test('returns denied on any thrown error', async () => {
    Platform.OS = 'ios';
    geo.requestAuthorization.mockRejectedValue(new Error('boom'));
    await expectResult('denied');
  });
});
