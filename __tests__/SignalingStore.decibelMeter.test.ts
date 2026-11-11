/**
 * @format
 */

import { AppState } from 'react-native';
import RNFS from 'react-native-fs';
import NitroSound, { AudioSourceAndroidType } from 'react-native-nitro-sound';
import { FlashlightModes } from '../constants';
import {
  DECIBEL_METER_RECORDING_PATH,
  SignalingStore,
} from '../src/stores/SignalingStore';

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
}));

// Mock react-native modules
jest.mock('react-native-torch', () => ({
  switchState: jest.fn(),
}));

jest.mock('react-native-sound', () => {
  const Sound = jest.fn().mockImplementation(() => ({
    play: jest.fn((callback: Function) => callback(true)),
    stop: jest.fn((callback?: Function) => callback && callback()),
    release: jest.fn(),
  })) as jest.Mock & { setCategory: jest.Mock; MAIN_BUNDLE: string };
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = '';
  return Sound;
});

jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
  getPowerState: jest.fn(() =>
    Promise.resolve({ batteryState: 'unplugged', charging: false }),
  ),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      type: 'wifi',
    }),
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  NativeModules: {},
  Platform: { OS: 'ios' },
}));

describe('SignalingStore - Decibel Meter', () => {
  let store: SignalingStore;

  beforeEach(() => {
    store = new SignalingStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setDecibelMeterActive', () => {
    it('should set decibel meter active state to true', () => {
      expect(store.decibelMeterActive).toBe(false);

      store.setDecibelMeterActive(true);

      expect(store.decibelMeterActive).toBe(true);
    });

    it('should set decibel meter active state to false', () => {
      store.setDecibelMeterActive(true);
      expect(store.decibelMeterActive).toBe(true);

      store.setDecibelMeterActive(false);

      expect(store.decibelMeterActive).toBe(false);
    });
  });

  describe('Initial state', () => {
    it('should have decibel meter inactive by default', () => {
      expect(store.decibelMeterActive).toBe(false);
    });

    it('has no session until the meter starts', () => {
      expect(store.soundSession).toBeNull();
    });
  });

  describe('active tool timing', () => {
    it('tracks flashlight and decibel start times independently', () => {
      const nowSpy = jest.spyOn(Date, 'now');

      nowSpy.mockReturnValueOnce(1000);
      store.setFlashlightMode(FlashlightModes.ON);

      nowSpy.mockReturnValueOnce(2000);
      store.setDecibelMeterActive(true);

      expect(store.getActiveSince('flashlight')).toBe(1000);
      expect(store.getActiveSince('decibel')).toBe(2000);

      store.setFlashlightMode(FlashlightModes.OFF);

      expect(store.getActiveSince('flashlight')).toBeNull();
      expect(store.getActiveSince('decibel')).toBe(2000);
    });
  });

  describe('startDecibelMeter / stopDecibelMeter', () => {
    const recorder = NitroSound as unknown as {
      startRecorder: jest.Mock;
      stopRecorder: jest.Mock;
      addRecordBackListener: jest.Mock;
      removeRecordBackListener: jest.Mock;
    };
    const fs = RNFS as unknown as { exists: jest.Mock; unlink: jest.Mock };

    it('records to the throwaway cache file with metering on', async () => {
      await store.startDecibelMeter();

      expect(store.decibelMeterActive).toBe(true);
      expect(recorder.startRecorder).toHaveBeenCalledWith(
        DECIBEL_METER_RECORDING_PATH,
        {
          AVModeIOS: 'measurement',
          AudioSourceAndroid: AudioSourceAndroidType.VOICE_RECOGNITION,
        },
        true,
      );
      expect(DECIBEL_METER_RECORDING_PATH).toMatch(/^\/tmp\/cache\//);
      expect(recorder.addRecordBackListener).toHaveBeenCalledTimes(1);
    });

    it('feeds readings into a fresh session while running', async () => {
      await store.startDecibelMeter();
      expect(store.soundSession).not.toBeNull();
      const listener = recorder.addRecordBackListener.mock.calls[0][0];

      listener({ currentMetering: -40 });
      expect(store.soundSession?.currentDbfs).toBe(-40);
      expect(store.soundSession?.maxDbfs).toBe(-40);

      await store.stopDecibelMeter();
      listener({ currentMetering: -5 });
      // Kept after stopping so the results can be read, but not added to.
      expect(store.soundSession?.maxDbfs).toBe(-40);
    });

    it('starts a new session each time the meter starts', async () => {
      await store.startDecibelMeter();
      recorder.addRecordBackListener.mock.calls[0][0]({ currentMetering: -20 });
      await store.stopDecibelMeter();

      await store.startDecibelMeter();
      expect(store.soundSession?.maxDbfs).toBeNull();
    });

    it('resets the session, carrying on if the meter is running', async () => {
      await store.startDecibelMeter();
      recorder.addRecordBackListener.mock.calls[0][0]({ currentMetering: -20 });

      store.resetSoundSession();
      expect(store.soundSession).not.toBeNull();
      expect(store.soundSession?.maxDbfs).toBeNull();

      await store.stopDecibelMeter();
      store.resetSoundSession();
      expect(store.soundSession).toBeNull();
    });

    it('stops the recorder and deletes the recording', async () => {
      await store.startDecibelMeter();
      fs.exists.mockResolvedValueOnce(true);

      await store.stopDecibelMeter();

      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.removeRecordBackListener).toHaveBeenCalled();
      expect(recorder.stopRecorder).toHaveBeenCalledTimes(1);
      expect(fs.unlink).toHaveBeenCalledWith(DECIBEL_METER_RECORDING_PATH);
    });

    it('does nothing when stopped while not running', async () => {
      await store.stopDecibelMeter();
      expect(recorder.stopRecorder).not.toHaveBeenCalled();
    });

    it('does not start a second recorder while one is running', async () => {
      await store.startDecibelMeter();
      await store.startDecibelMeter();
      expect(recorder.startRecorder).toHaveBeenCalledTimes(1);
    });

    it('stays stopped and rethrows when the recorder fails to start', async () => {
      recorder.startRecorder.mockRejectedValueOnce(
        new Error('Recording permission denied.'),
      );

      await expect(store.startDecibelMeter()).rejects.toThrow('permission');
      expect(store.decibelMeterActive).toBe(false);
      expect(store.getActiveSince('decibel')).toBeNull();
      expect(store.soundSession).toBeNull();
    });

    it('releases the recorder if stopped while it was starting', async () => {
      let finishStart!: () => void;
      recorder.startRecorder.mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishStart = () => resolve('');
          }),
      );

      const starting = store.startDecibelMeter();
      await Promise.resolve();
      await Promise.resolve();
      const stopping = store.stopDecibelMeter();
      finishStart();
      await Promise.all([starting, stopping]);

      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.stopRecorder).toHaveBeenCalled();
    });

    it('stops when ColdBoot goes to the background, not when inactive', async () => {
      const onChange = (AppState.addEventListener as jest.Mock).mock.calls.at(
        -1,
      )[1];
      await store.startDecibelMeter();

      onChange('inactive');
      await Promise.resolve();
      expect(store.decibelMeterActive).toBe(true);

      onChange('background');
      await Promise.resolve();
      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.removeRecordBackListener).toHaveBeenCalled();
    });
  });
});
