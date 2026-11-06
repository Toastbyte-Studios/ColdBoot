import { NativeModules, Platform } from 'react-native';
import {
  batteryTemperatureStatus,
  formatTemperature,
  readBatteryTemperature,
} from '../src/utils/batteryTemperature';

describe('batteryTemperatureStatus', () => {
  it('says not to charge at or below freezing', () => {
    expect(batteryTemperatureStatus(0)).toMatchObject({
      tone: 'poor',
      label: 'Too cold to charge',
    });
    expect(batteryTemperatureStatus(-12).advice).toMatch(/Don't plug it in/);
  });

  it('warns that a cold battery drains faster', () => {
    expect(batteryTemperatureStatus(3)).toMatchObject({
      tone: 'fair',
      label: 'Cold',
    });
  });

  it('is normal in between', () => {
    expect(batteryTemperatureStatus(5)).toEqual({
      tone: 'good',
      label: 'Normal',
    });
    expect(batteryTemperatureStatus(30).tone).toBe('good');
  });

  it('warns when too hot to charge', () => {
    expect(batteryTemperatureStatus(45)).toMatchObject({
      tone: 'poor',
      label: 'Hot',
    });
  });
});

describe('formatTemperature', () => {
  it('shows the user’s units with a true minus sign', () => {
    expect(formatTemperature(-3.4, 'metric')).toBe('−3 °C');
    expect(formatTemperature(-3.4, 'imperial')).toBe('26 °F');
    expect(formatTemperature(-25, 'imperial')).toBe('−13 °F');
    expect(formatTemperature(21.6, 'metric')).toBe('22 °C');
  });
});

describe('readBatteryTemperature', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    delete NativeModules.BatteryTemperature;
  });

  it('is null on iOS without touching native code', async () => {
    Platform.OS = 'ios';
    NativeModules.BatteryTemperature = { getTemperature: jest.fn() };
    await expect(readBatteryTemperature()).resolves.toBeNull();
    expect(
      NativeModules.BatteryTemperature.getTemperature,
    ).not.toHaveBeenCalled();
  });

  it('reads the native module on Android', async () => {
    Platform.OS = 'android';
    NativeModules.BatteryTemperature = {
      getTemperature: jest.fn().mockResolvedValue(-2.5),
    };
    await expect(readBatteryTemperature()).resolves.toBe(-2.5);
  });

  it('is null when the module is missing, returns nothing, or fails', async () => {
    Platform.OS = 'android';
    await expect(readBatteryTemperature()).resolves.toBeNull();

    NativeModules.BatteryTemperature = {
      getTemperature: jest.fn().mockResolvedValue(null),
    };
    await expect(readBatteryTemperature()).resolves.toBeNull();

    NativeModules.BatteryTemperature = {
      getTemperature: jest.fn().mockRejectedValue(new Error('boom')),
    };
    await expect(readBatteryTemperature()).resolves.toBeNull();
  });
});
