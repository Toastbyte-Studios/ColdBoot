import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type LocationPermissionResult = 'granted' | 'denied';

/**
 * Cross-platform foreground location permission request.
 *
 * `react-native-geolocation-service` exposes `requestAuthorization` for iOS
 * only; Android must use `PermissionsAndroid` before requesting a GPS fix.
 */
export async function requestForegroundLocationPermission(): Promise<LocationPermissionResult> {
  try {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted' ? 'granted' : 'denied';
    }

    if (Platform.OS === 'android') {
      const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

      const [fineGranted, coarseGranted] = await Promise.all([
        PermissionsAndroid.check(fine),
        PermissionsAndroid.check(coarse),
      ]);

      if (fineGranted || coarseGranted) {
        return 'granted';
      }

      const result = await PermissionsAndroid.request(fine, {
        title: 'Location permission',
        message:
          'Cold Boot needs your location to show local sunrise and sunset times.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      });

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }

      const coarseAfterRequest = await PermissionsAndroid.check(coarse);
      return coarseAfterRequest ? 'granted' : 'denied';
    }

    return 'denied';
  } catch {
    return 'denied';
  }
}
