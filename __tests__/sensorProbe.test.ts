import { probeSensor } from '../src/screens/DeviceStatus/sensorProbe';

type Next = (reading: unknown) => void;
type Fail = (err: unknown) => void;

function fakeSensor(behaviour: (next: Next, fail: Fail) => void) {
  const unsubscribe = jest.fn();
  return {
    unsubscribe,
    sensor: {
      subscribe: (next: Next, fail: Fail) => {
        behaviour(next, fail);
        return { unsubscribe };
      },
    },
  };
}

describe('probeSensor', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is present once a reading arrives, and stops listening', async () => {
    const { sensor, unsubscribe } = fakeSensor((next) =>
      setTimeout(() => next({ x: 1 }), 100),
    );
    const result = probeSensor(sensor);
    jest.advanceTimersByTime(100);
    await expect(result).resolves.toBe('present');
    jest.runOnlyPendingTimers();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('is absent when the sensor errors, even synchronously', async () => {
    const { sensor, unsubscribe } = fakeSensor((_next, fail) =>
      fail(new Error('Sensor magnetometer is not available')),
    );
    const result = probeSensor(sensor);
    await expect(result).resolves.toBe('absent');
    jest.runOnlyPendingTimers();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('is unknown, not absent, if nothing arrives in time', async () => {
    const { sensor } = fakeSensor(() => {});
    const result = probeSensor(sensor, 2000);
    jest.advanceTimersByTime(2000);
    await expect(result).resolves.toBe('unknown');
  });

  it('is absent if subscribing throws', async () => {
    await expect(
      probeSensor({
        subscribe: () => {
          throw new Error('no native module');
        },
      }),
    ).resolves.toBe('absent');
  });
});
