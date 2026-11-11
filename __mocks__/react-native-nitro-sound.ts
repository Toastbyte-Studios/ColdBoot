/**
 * Mock for react-native-nitro-sound, a Nitro module with no JS fallback.
 *
 * `SignalingStore` drives the decibel meter's recorder through the default
 * export, so anything that builds the store needs this. Tests that exercise a
 * recorder screen can still `jest.mock` the module with their own factory.
 */

export enum AudioSourceAndroidType {
  DEFAULT = 0,
  MIC = 1,
  VOICE_RECOGNITION = 6,
  UNPROCESSED = 9,
}

const NitroSound = {
  startRecorder: jest.fn(() => Promise.resolve('')),
  stopRecorder: jest.fn(() => Promise.resolve('')),
  addRecordBackListener: jest.fn(),
  removeRecordBackListener: jest.fn(),
};

export const useSoundRecorder = () => ({
  startRecorder: NitroSound.startRecorder,
  stopRecorder: NitroSound.stopRecorder,
});

export default NitroSound;
