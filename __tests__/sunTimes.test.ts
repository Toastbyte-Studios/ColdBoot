import { formatDuration, formatElapsed } from '../src/utils/sunTimes';

function loadGetSolarSnapshot() {
  let getSolarSnapshot!: typeof import('../src/utils/sunTimes').getSolarSnapshot;
  jest.isolateModules(() => {
    ({ getSolarSnapshot } = require('../src/utils/sunTimes'));
  });
  return getSolarSnapshot;
}

describe('sunTimes utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock('suncalc');
  });

  it('returns null when SunCalc cannot resolve a polar-style snapshot', () => {
    jest.doMock('suncalc', () => ({
      getTimes: () => ({
        sunrise: new Date('invalid'),
        sunset: new Date('invalid'),
        dawn: new Date('invalid'),
        dusk: new Date('invalid'),
        solarNoon: new Date('invalid'),
        goldenHour: new Date('invalid'),
        goldenHourEnd: new Date('invalid'),
      }),
    }));

    const getSolarSnapshot = loadGetSolarSnapshot();

    expect(getSolarSnapshot(89.9, 0, new Date('2024-06-21T12:00:00Z'))).toBe(
      null,
    );
  });

  it('uses the full sunrise-to-sunset span before sunrise', () => {
    const todayTimes = {
      sunrise: new Date('2024-06-21T06:00:00Z'),
      sunset: new Date('2024-06-21T18:00:00Z'),
      dawn: new Date('2024-06-21T05:30:00Z'),
      dusk: new Date('2024-06-21T18:30:00Z'),
      solarNoon: new Date('2024-06-21T12:00:00Z'),
      goldenHour: new Date('2024-06-21T17:00:00Z'),
      goldenHourEnd: new Date('2024-06-21T07:00:00Z'),
    };
    const nextDayTimes = {
      sunrise: new Date('2024-06-22T06:01:00Z'),
      sunset: new Date('2024-06-22T18:01:00Z'),
      dawn: new Date('2024-06-22T05:31:00Z'),
      dusk: new Date('2024-06-22T18:31:00Z'),
      solarNoon: new Date('2024-06-22T12:01:00Z'),
      goldenHour: new Date('2024-06-22T17:01:00Z'),
      goldenHourEnd: new Date('2024-06-22T07:01:00Z'),
    };

    jest.doMock('suncalc', () => ({
      getTimes: (date: Date) =>
        date.getUTCDate() === 21 ? todayTimes : nextDayTimes,
    }));

    const getSolarSnapshot = loadGetSolarSnapshot();
    const snapshot = getSolarSnapshot(
      40.7128,
      -74.006,
      new Date('2024-06-21T04:00:00Z'),
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.daylightRemainingMs).toBe(12 * 60 * 60 * 1000);
    expect(snapshot?.nextSunrise.getTime()).toBeGreaterThan(
      snapshot!.sunset.getTime(),
    );
  });

  it('formats duration and elapsed boundaries consistently', () => {
    expect(formatDuration(59 * 60 * 1000)).toBe('59m');
    expect(formatDuration(60 * 60 * 1000)).toBe('1h 00m');
    expect(formatDuration(128 * 60 * 1000)).toBe('2h 08m');

    expect(formatElapsed(59 * 60 * 1000 + 9 * 1000)).toBe('59m 09s');
    expect(formatElapsed(64 * 60 * 1000)).toBe('1h 04m');
  });
});
