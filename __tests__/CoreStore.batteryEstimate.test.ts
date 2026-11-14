import DeviceInfo from 'react-native-device-info';
import { CoreStore } from '../src/stores/CoreStore';

jest.mock('../src/utils/batteryTemperature', () => ({
  readBatteryTemperature: jest.fn(() => Promise.resolve(null)),
}));

type Internals = { sampleBattery: () => Promise<void> };
type DeviceInfoMock = { getPowerState: jest.Mock; getBatteryLevel: jest.Mock };

const device = DeviceInfo as unknown as DeviceInfoMock;

function setBattery(level: number, state: 'unplugged' | 'charging') {
  device.getBatteryLevel = jest.fn().mockResolvedValue(level);
  device.getPowerState = jest.fn().mockResolvedValue({ batteryState: state });
}

describe('CoreStore battery estimate', () => {
  let core: CoreStore;
  let now: jest.SpyInstance;
  const sample = () => (core as unknown as Internals).sampleBattery();

  beforeEach(() => {
    core = new CoreStore();
    now = jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    now.mockRestore();
    core.dispose();
  });

  it('starts from a baseline and says it is not measured', async () => {
    setBattery(0.6, 'unplugged');
    await sample();

    // 8 hours from full: a guess about phones in general, not this one.
    expect(core.batteryEstimateMinutes).toBe(288);
    expect(core.batteryEstimateMeasured).toBe(false);
  });

  it('becomes measured once the level has been seen to drop', async () => {
    setBattery(0.6, 'unplugged');
    await sample();

    now.mockReturnValue(10 * 60_000);
    setBattery(0.58, 'unplugged');
    await sample();

    // 2% in 10 minutes leaves 290 minutes at 58%.
    expect(core.batteryEstimateMinutes).toBeCloseTo(290, 5);
    expect(core.batteryEstimateMeasured).toBe(true);
  });

  it('goes back to unmeasured when plugged in before the level has risen', async () => {
    setBattery(0.6, 'unplugged');
    await sample();
    now.mockReturnValue(10 * 60_000);
    setBattery(0.58, 'unplugged');
    await sample();

    now.mockReturnValue(11 * 60_000);
    setBattery(0.58, 'charging');
    await sample();

    // 2 hours for a full charge: again a baseline, not a reading.
    expect(core.batteryEstimateMinutes).toBe(50);
    expect(core.batteryEstimateMeasured).toBe(false);
  });

  it('is measured while charging once the level has been seen to rise', async () => {
    setBattery(0.5, 'charging');
    await sample();
    expect(core.batteryEstimateMeasured).toBe(false);

    now.mockReturnValue(10 * 60_000);
    setBattery(0.6, 'charging');
    await sample();

    expect(core.batteryEstimateMinutes).toBeCloseTo(40, 5);
    expect(core.batteryEstimateMeasured).toBe(true);
  });
});
