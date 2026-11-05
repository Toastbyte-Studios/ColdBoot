import {
  accuracyTone,
  fixAgeTone,
  formatAge,
  formatCoordinates,
  formatMeters,
  STALE_FIX_MS,
} from '../src/screens/DeviceStatus/deviceStatusFormatters';

describe('location formatters', () => {
  it('formats coordinates with hemispheres', () => {
    expect(formatCoordinates(34.0522, -118.2437)).toBe(
      '34.05220° N, 118.24370° W',
    );
    expect(formatCoordinates(-33.8688, 151.2093)).toBe(
      '33.86880° S, 151.20930° E',
    );
  });

  it('shows lengths in the chosen units', () => {
    expect(formatMeters(8, 'metric')).toBe('8 m');
    expect(formatMeters(8, 'imperial')).toBe('26 ft');
    expect(formatMeters(1609.344, 'imperial')).toBe('5,280 ft');
  });

  it('bands accuracy by what the fix is good for', () => {
    expect(accuracyTone(5)).toEqual({ tone: 'good', label: 'Good' });
    expect(accuracyTone(10)).toEqual({ tone: 'good', label: 'Good' });
    expect(accuracyTone(35)).toEqual({ tone: 'fair', label: 'Fair' });
    expect(accuracyTone(120)).toEqual({ tone: 'poor', label: 'Poor' });
    expect(accuracyTone(null)).toEqual({ tone: 'neutral', label: 'Unknown' });
    expect(accuracyTone(NaN)).toEqual({ tone: 'neutral', label: 'Unknown' });
  });

  it('describes fix age', () => {
    const now = 1_000_000_000_000;
    expect(formatAge(now - 20_000, now)).toBe('Just now');
    expect(formatAge(now - 4 * 60_000, now)).toBe('4 min ago');
    expect(formatAge(now - 2 * 3_600_000, now)).toBe('2 hr ago');
    expect(formatAge(now - 24 * 3_600_000, now)).toBe('1 day ago');
    expect(formatAge(now - 72 * 3_600_000, now)).toBe('3 days ago');
    // A timestamp slightly in the future (clock skew) is still "Just now".
    expect(formatAge(now + 5_000, now)).toBe('Just now');
  });

  it('flags a fix as stale past five minutes', () => {
    const now = 1_000_000_000_000;
    expect(fixAgeTone(now - 60_000, now)).toBe('good');
    expect(fixAgeTone(now - STALE_FIX_MS - 1, now)).toBe('poor');
  });
});
