import {
  bearingDegrees,
  compassPoint,
  formatDistance,
  lastTrackText,
  nearestSafePoint,
  parseCoordinateText,
  positionHeadline,
} from '../src/modules/Navigation/navigationHero';

const LA = { latitude: 34.0522, longitude: -118.2437 };
const NOW = 1_800_000_000_000;

describe('positionHeadline', () => {
  it('leads with the MGRS grid and says how far to trust it', () => {
    const result = positionHeadline(
      { coords: { ...LA, accuracy: 6 }, timestamp: NOW - 2 * 60_000 },
      false,
      'metric',
      NOW,
    );
    expect(result.headline).toMatch(/^11S LT \d{5} \d{5}$/);
    expect(result.detail).toBe('±6 m · Good · 2 min ago');
    expect(result.tone).toBeUndefined();
  });

  it('turns amber for a stale or poor fix', () => {
    expect(
      positionHeadline(
        { coords: { ...LA, accuracy: 6 }, timestamp: NOW - 30 * 60_000 },
        false,
        'metric',
        NOW,
      ).tone,
    ).toBe('fair');
    expect(
      positionHeadline(
        { coords: { ...LA, accuracy: 200 }, timestamp: NOW },
        false,
        'metric',
        NOW,
      ).tone,
    ).toBe('fair');
  });

  it('falls back to degrees outside MGRS range', () => {
    expect(
      positionHeadline(
        {
          coords: { latitude: 86.5, longitude: 10, accuracy: 5 },
          timestamp: NOW,
        },
        false,
        'metric',
        NOW,
      ).headline,
    ).toBe('86.5000, 10.0000');
  });

  it('explains a missing fix', () => {
    expect(positionHeadline(null, true, 'metric', NOW).headline).toBe(
      'Location off',
    );
    expect(positionHeadline(null, false, 'metric', NOW).headline).toBe(
      'Waiting for GPS…',
    );
  });
});

describe('parseCoordinateText', () => {
  it('reads decimal coordinates, with or without hemispheres', () => {
    expect(parseCoordinateText('34.05, -118.24')).toEqual({
      latitude: 34.05,
      longitude: -118.24,
    });
    expect(parseCoordinateText('34.05° N, 118.24° W')).toEqual({
      latitude: 34.05,
      longitude: -118.24,
    });
  });

  it('ignores addresses and nonsense', () => {
    expect(parseCoordinateText('12 Oak St 4')).toBeNull();
    expect(parseCoordinateText('Creek bridge by the old mill')).toBeNull();
    expect(parseCoordinateText('95, 200')).toBeNull();
    expect(parseCoordinateText(undefined)).toBeNull();
  });
});

describe('bearing and direction', () => {
  it('points the right way', () => {
    const north = { latitude: LA.latitude + 1, longitude: LA.longitude };
    const east = { latitude: LA.latitude, longitude: LA.longitude + 1 };
    expect(compassPoint(bearingDegrees(LA, north))).toBe('N');
    expect(compassPoint(bearingDegrees(LA, east))).toBe('E');
    expect(compassPoint(350)).toBe('N');
    expect(compassPoint(200)).toBe('S');
  });
});

describe('formatDistance', () => {
  it('uses the right unit for the distance', () => {
    expect(formatDistance(1.24, 'imperial')).toBe('1.2 mi');
    expect(formatDistance(0.05, 'imperial')).toBe('264 ft');
    expect(formatDistance(2, 'metric')).toBe('3.2 km');
    expect(formatDistance(0.3, 'metric')).toBe('483 m');
  });
});

describe('nearestSafePoint', () => {
  it('picks the closest rally point or waypoint', () => {
    const result = nearestSafePoint(
      LA,
      [
        {
          name: 'Far camp',
          kind: 'Waypoint',
          latitude: 35,
          longitude: -118.24,
        },
        {
          name: 'Creek bridge',
          kind: 'Rally point',
          latitude: LA.latitude + 0.012,
          longitude: LA.longitude + 0.012,
        },
      ],
      'imperial',
    );
    expect(result).toEqual({
      label: 'Rally point',
      value: 'Creek bridge · 1.1 mi NE',
    });
  });

  it('is null without a fix or anything to measure to', () => {
    expect(nearestSafePoint(null, [], 'metric')).toBeNull();
    expect(nearestSafePoint(LA, [], 'metric')).toBeNull();
  });
});

describe('lastTrackText', () => {
  it('describes the newest track', () => {
    const text = lastTrackText(
      [
        { createdAt: '2026-11-01T10:00:00Z', distanceMeters: 1000 },
        { createdAt: '2026-11-05T18:00:00Z', distanceMeters: 3862 },
      ],
      'imperial',
    );
    expect(text).toMatch(/^2\.4 mi · Nov 5$/);
    expect(lastTrackText([], 'metric')).toBeNull();
  });
});
