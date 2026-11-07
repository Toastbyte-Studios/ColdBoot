import DeviceInfo from 'react-native-device-info';
import { CoreStore } from '../src/stores/CoreStore';
import { readBatteryTemperature } from '../src/utils/batteryTemperature';

jest.mock('../src/utils/batteryTemperature', () => ({
  readBatteryTemperature: jest.fn(),
}));

type Internals = { sampleBattery: () => Promise<void> };

describe('CoreStore battery temperature', () => {
  beforeEach(() => {
    (DeviceInfo as unknown as { getPowerState: jest.Mock }).getPowerState = jest
      .fn()
      .mockResolvedValue({ batteryState: 'unplugged' });
  });

  it('keeps the reading from each battery sample', async () => {
    (readBatteryTemperature as jest.Mock).mockResolvedValueOnce(-1.5);
    const core = new CoreStore();
    await (core as unknown as Internals).sampleBattery();

    expect(core.batteryTemperatureC).toBe(-1.5);
    expect(core.batteryLevel).toBe(0.75);
    core.dispose();
  });

  it('keeps the reading even if the power state cannot be read', async () => {
    (readBatteryTemperature as jest.Mock).mockResolvedValueOnce(2);
    (DeviceInfo as unknown as { getPowerState: jest.Mock }).getPowerState = jest
      .fn()
      .mockRejectedValue(new Error('unavailable'));
    const core = new CoreStore();
    await (core as unknown as Internals).sampleBattery();

    expect(core.batteryTemperatureC).toBe(2);
    core.dispose();
  });

  it('is null where the platform has none', async () => {
    (readBatteryTemperature as jest.Mock).mockResolvedValueOnce(null);
    const core = new CoreStore();
    await (core as unknown as Internals).sampleBattery();

    expect(core.batteryTemperatureC).toBeNull();
    core.dispose();
  });
});
