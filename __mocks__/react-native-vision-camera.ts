/**
 * Mock for react-native-vision-camera, a Nitro module with no JS fallback.
 *
 * Covers what `PantryScanCamera` uses. Camera access starts granted; a test
 * can change `mockCameraPermission.status` before rendering. The preview
 * renders nothing.
 */

import type { ScannedObject } from 'react-native-vision-camera';

export const mockCameraPermission = {
  status: 'authorized' as
    | 'not-determined'
    | 'authorized'
    | 'denied'
    | 'restricted',
  requestPermission: jest.fn(() => Promise.resolve(true)),
};

export const useCameraPermission = () => ({
  status: mockCameraPermission.status,
  hasPermission: mockCameraPermission.status === 'authorized',
  canRequestPermission: mockCameraPermission.status === 'not-determined',
  requestPermission: mockCameraPermission.requestPermission,
});

export const useObjectOutput = jest.fn(
  (props: { onObjectsScanned?: (objects: ScannedObject[]) => void }) => ({
    mockObjectOutput: true,
    ...props,
  }),
);

export const isScannedCode = (object: object) => 'value' in object;

export const Camera = () => null;
