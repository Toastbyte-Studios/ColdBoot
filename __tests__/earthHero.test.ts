import {
  dayLengthText,
  nextFullMoonText,
  nextSkyEventText,
  pressureHeadline,
  sparklineSamples,
} from '../src/modules/Earth/earthHero';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 7, 18);

/** Hourly samples over `hours`, from `start` changing by `step` hPa each. */
const series = (hours: number, start: number, step: number) =>
  Array.from({ length: hours + 1 }, (_, i) => ({
    timestamp: NOW - (hours - i) * HOUR,
    pressure: start + i * step,
  }));

describe('pressureHeadline', () => {
  it('reads a falling trend as incoming weather, in amber', () => {
    const history = series(3, 1015, -1);
    const result = pressureHeadline(history, 1012, false, 'metric', NOW);
    expect(result.headline).toBe('Pressure falling');
    expect(result.detail).toMatch(/incoming weather/);
    expect(result.tone).toBe('fair');
  });

  it('reads rising as clearing and steady as stable', () => {
    expect(
      pressureHeadline(series(3, 1008, 1), 1011, false, 'metric', NOW),
    ).toMatchObject({ headline: 'Pressure rising', tone: 'good' });
    expect(
      pressureHeadline(series(3, 1013, 0), 1013, false, 'metric', NOW).headline,
    ).toBe('Pressure steady');
  });

  it('shows the reading until there is enough history for a trend', () => {
    const result = pressureHeadline(
      series(1, 1013, 0),
      1013,
      false,
      'metric',
      NOW,
    );
    expect(result.detail).toBe(
      'The trend shows after about 1.5 h of readings.',
    );
  });

  it('says when Cold mode has paused the sensor, or no reading exists', () => {
    expect(pressureHeadline([], 1013, true, 'metric', NOW)).toMatchObject({
      headline: 'Barometer paused',
      tone: 'muted',
    });
    expect(pressureHeadline([], null, false, 'metric', NOW).headline).toBe(
      'No reading yet',
    );
  });
});

describe('sparklineSamples', () => {
  it('keeps only the last 12 hours', () => {
    expect(sparklineSamples(series(24, 1013, 0), NOW)).toHaveLength(13);
  });
});

describe('nextSkyEventText', () => {
  it('names the event and when, mid-sentence', () => {
    const now = new Date(2026, 10, 7, 9);
    expect(
      nextSkyEventText(
        { label: 'Supermoon', date: new Date(2026, 10, 25, 3) },
        now,
      ),
    ).toBe('Supermoon · in 18 days');
    expect(nextSkyEventText(null, now)).toBeNull();
  });
});

describe('dayLengthText', () => {
  it('gives daylight and its change from yesterday', () => {
    // Los Angeles in November: days shortening by a minute or two.
    const text = dayLengthText(34.05, -118.24, new Date(NOW));
    expect(text).toMatch(/^10 h \d+ m · −[12] min$/);
  });

  it('is null with no sunrise or sunset (polar night)', () => {
    expect(dayLengthText(80, 15, new Date(Date.UTC(2026, 11, 21)))).toBeNull();
  });

  it('uses sunrise and sunset when civil twilight is unavailable', () => {
    expect(dayLengthText(65.5, 0, new Date(Date.UTC(2026, 5, 21, 12)))).toMatch(
      /^\d+ h \d+ m · [−+±]\d+ min$/,
    );
  });
});

describe('nextFullMoonText', () => {
  it('counts down to the next full moon', () => {
    // Full moon on 24 Nov 2026; a week before reads as days to go.
    expect(nextFullMoonText(new Date(2026, 10, 17, 12))).toMatch(
      /^In \d+ days$/,
    );
  });
});
