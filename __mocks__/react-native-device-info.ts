/**
 * Mock for react-native-device-info
 */

const DeviceInfo = {
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getApplicationName: jest.fn(() => 'Cold Boot'),
  getBundleId: jest.fn(() => 'studio.toastbyte.coldboot'),
  getDeviceId: jest.fn(() => 'test-device-id'),
  getDeviceType: jest.fn(() => 'Handset'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '15.0'),
  getUniqueId: jest.fn(() => Promise.resolve('unique-test-id')),
  getUniqueIdSync: jest.fn(() => 'unique-test-id'),
  isEmulator: jest.fn(() => Promise.resolve(true)),
  isEmulatorSync: jest.fn(() => true),
  getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
  getBatteryLevelSync: jest.fn(() => 0.75),
  isBatteryCharging: jest.fn(() => Promise.resolve(false)),
  isBatteryChargingSync: jest.fn(() => false),
  useBatteryLevel: jest.fn(() => 0.75),
  useBatteryLevelIsLow: jest.fn(() => false),
  useIsHeadphonesConnected: jest.fn(() => false),
  usePowerState: jest.fn(() => ({
    batteryLevel: 0.75,
    batteryState: 'unplugged',
    lowPowerMode: false,
  })),
  is24Hour: jest.fn(() => false),
};

export default DeviceInfo;
