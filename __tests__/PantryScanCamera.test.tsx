/**
 * @format
 * The camera panel of the scan screen, against the VisionCamera mock in
 * `__mocks__/react-native-vision-camera.ts`.
 */

import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  mockCameraPermission,
  useObjectOutput,
} from '../__mocks__/react-native-vision-camera';
import { PantryScanCamera } from '../src/screens/Pantry/scan/PantryScanCamera';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/stores', () => ({
  useSettingsStore: () => ({ themeMode: 'light', fontScale: 1 }),
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

const mockedObjectOutput = useObjectOutput as jest.Mock;

function render(onCodes = jest.fn()) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PantryScanCamera isActive onCodes={onCodes} />,
    );
  });
  return tree;
}

/** The `onObjectsScanned` callback the panel last gave the object output. */
function lastScanCallback() {
  const calls = mockedObjectOutput.mock.calls;
  return calls[calls.length - 1][0].onObjectsScanned as (
    objects: object[],
  ) => void;
}

describe('PantryScanCamera', () => {
  beforeEach(() => {
    mockCameraPermission.status = 'authorized';
    mockCameraPermission.requestPermission.mockClear();
    mockedObjectOutput.mockClear();
  });

  it('asks for camera access the first time', () => {
    mockCameraPermission.status = 'not-determined';
    const tree = render();

    tree.root.findByProps({ testID: 'scan-permission-request' });
    ReactTestRenderer.act(() =>
      tree.root.findByProps({ label: 'Allow camera' }).props.onPress(),
    );
    expect(mockCameraPermission.requestPermission).toHaveBeenCalled();
    expect(mockedObjectOutput).not.toHaveBeenCalled();
  });

  it('points to Settings when access was refused', () => {
    mockCameraPermission.status = 'denied';
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    const tree = render();

    tree.root.findByProps({ testID: 'scan-permission-denied' });
    ReactTestRenderer.act(() =>
      tree.root.findByProps({ label: 'Open Settings' }).props.onPress(),
    );
    expect(openSettings).toHaveBeenCalled();
    openSettings.mockRestore();
  });

  it('scans only retail product codes', () => {
    render();
    expect(mockedObjectOutput).toHaveBeenCalledWith(
      expect.objectContaining({ types: ['ean-13', 'ean-8', 'upc-e'] }),
    );
  });

  it('passes on decoded codes and skips anything without a value', () => {
    const onCodes = jest.fn();
    render(onCodes);

    lastScanCallback()([
      { type: 'ean-13', value: '0036000291452' },
      { type: 'ean-13', value: undefined },
      { type: 'face', faceID: 1 },
    ]);
    expect(onCodes).toHaveBeenCalledWith(['0036000291452']);
  });

  it('stays quiet when a report holds no codes', () => {
    const onCodes = jest.fn();
    render(onCodes);

    lastScanCallback()([{ type: 'face', faceID: 1 }]);
    expect(onCodes).not.toHaveBeenCalled();
  });

  it('shows a camera error and lets the user retry', () => {
    const tree = render();
    const camera = tree.root.findByProps({ device: 'back' });

    ReactTestRenderer.act(() =>
      camera.props.onError(new Error('Camera in use by another app')),
    );
    tree.root.findByProps({ testID: 'scan-camera-error' });

    ReactTestRenderer.act(() =>
      tree.root.findByProps({ label: 'Try again' }).props.onPress(),
    );
    expect(tree.root.findByProps({ device: 'back' })).toBeTruthy();
  });
});
