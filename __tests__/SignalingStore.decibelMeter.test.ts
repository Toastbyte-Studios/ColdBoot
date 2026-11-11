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

let mockPlatformOS = 'ios';
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  NativeModules: {},
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
  },
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

    /** Lets every queued promise callback run. */
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    /** A promise and the function that settles it, usable in either order. */
    const deferred = () => {
      let release!: () => void;
      const released = new Promise<string>((resolve) => {
        release = () => resolve('');
      });
      return { released, release };
    };

    /** Makes the next stopRecorder hang until the returned function is called. */
    const holdNextStop = () => {
      const { released, release } = deferred();
      recorder.stopRecorder.mockImplementationOnce(() => released);
      return release;
    };

    /** Makes the next startRecorder hang until the returned function is called. */
    const holdNextStart = () => {
      const { released, release } = deferred();
      recorder.startRecorder.mockImplementationOnce(() => released);
      return release;
    };

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
      const finishStart = holdNextStart();

      const starting = store.startDecibelMeter();
      await flush();
      const stopping = store.stopDecibelMeter();
      finishStart();
      await Promise.all([starting, stopping]);

      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.stopRecorder).toHaveBeenCalled();
    });

    it('waits for a pending stop before starting the recorder again', async () => {
      await store.startDecibelMeter();
      const finishStop = holdNextStop();

      const stopping = store.stopDecibelMeter();
      const restarting = store.startDecibelMeter();
      await flush();

      // The meter shows as running again, but the recorder hasn't been
      // touched until the old one has stopped and its file is gone.
      expect(store.decibelMeterActive).toBe(true);
      expect(recorder.startRecorder).toHaveBeenCalledTimes(1);

      fs.exists.mockResolvedValue(true);
      finishStop();
      await Promise.all([stopping, restarting]);
      fs.exists.mockResolvedValue(false);

      expect(recorder.startRecorder).toHaveBeenCalledTimes(2);
      // The old stop's delete ran before the new recording started.
      const deleted = fs.unlink.mock.invocationCallOrder;
      const started = recorder.startRecorder.mock.invocationCallOrder[1];
      expect(deleted.some((order) => order < started)).toBe(true);
      expect(deleted.every((order) => order < started)).toBe(true);
      expect(store.decibelMeterActive).toBe(true);
      expect(recorder.addRecordBackListener).toHaveBeenCalledTimes(2);
    });

    it('skips a start that was stopped before its turn', async () => {
      await store.startDecibelMeter();
      const finishStop = holdNextStop();

      const stopping = store.stopDecibelMeter();
      const restarting = store.startDecibelMeter();
      const stoppingAgain = store.stopDecibelMeter();
      finishStop();
      await Promise.all([stopping, restarting, stoppingAgain]);

      expect(recorder.startRecorder).toHaveBeenCalledTimes(1);
      expect(recorder.stopRecorder).toHaveBeenCalledTimes(1);
      expect(store.decibelMeterActive).toBe(false);
    });

    it('releases the recorder when the store is disposed', async () => {
      await store.startDecibelMeter();

      store.dispose();
      await flush();

      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.removeRecordBackListener).toHaveBeenCalled();
      expect(recorder.stopRecorder).toHaveBeenCalledTimes(1);
    });

    it('releases a recorder that was still starting when disposed', async () => {
      const finishStart = holdNextStart();

      const starting = store.startDecibelMeter();
      await flush();
      store.dispose();
      finishStart();
      await starting;
      await flush();

      expect(recorder.stopRecorder).toHaveBeenCalledTimes(1);
      expect(store.decibelMeterActive).toBe(false);
    });

    it('does not start again once disposed', async () => {
      store.dispose();
      await store.startDecibelMeter();

      expect(store.decibelMeterActive).toBe(false);
      expect(recorder.startRecorder).not.toHaveBeenCalled();
    });

    it("finishes a disposed store's cleanup before the next store records", async () => {
      await store.startDecibelMeter();
      const finishStop = holdNextStop();

      // What RootStore.reset() does: dispose, then build a fresh store.
      store.dispose();
      const next = new SignalingStore();
      const starting = next.startDecibelMeter();
      await flush();
      expect(recorder.startRecorder).toHaveBeenCalledTimes(1);

      finishStop();
      await starting;

      expect(recorder.startRecorder).toHaveBeenCalledTimes(2);
      expect(recorder.stopRecorder.mock.invocationCallOrder[0]).toBeLessThan(
        recorder.startRecorder.mock.invocationCallOrder[1],
      );
      expect(next.decibelMeterActive).toBe(true);
      await next.stopDecibelMeter();
    });

    it('records power readings on iOS and peaks on Android', async () => {
      await store.startDecibelMeter();
      // The suite mocks Platform.OS as iOS.
      expect(store.soundSession?.readings).toBe('power');
      await store.stopDecibelMeter();

      // The platform is read once, when the store module loads.
      let AndroidStore!: typeof SignalingStore;
      mockPlatformOS = 'android';
      try {
        jest.isolateModules(() => {
          AndroidStore = require('../src/stores/SignalingStore').SignalingStore;
        });
      } finally {
        mockPlatformOS = 'ios';
      }
      const android = new AndroidStore();
      await android.startDecibelMeter();
      expect(android.soundSession?.readings).toBe('peak');
      await android.stopDecibelMeter();
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
