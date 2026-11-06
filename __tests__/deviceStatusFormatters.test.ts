import {
  accuracyTone,
  batteryEstimate,
  batteryTone,
  connectionSummary,
  formatMinutes,
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

  it('allows for the longer Cold mode poll before calling a fix stale', () => {
    const now = 1_000_000_000_000;
    const tenMinutes = 10 * 60_000;
    expect(fixAgeTone(now - 7 * 60_000, now, tenMinutes)).toBe('good');
    expect(fixAgeTone(now - 26 * 60_000, now, tenMinutes)).toBe('poor');
  });

  it('flags a fix as stale past five minutes', () => {
    const now = 1_000_000_000_000;
    expect(fixAgeTone(now - 60_000, now)).toBe('good');
    expect(fixAgeTone(now - STALE_FIX_MS - 1, now)).toBe('poor');
  });
});

describe('battery formatters', () => {
  it('bands the level, and treats charging as fine', () => {
    expect(batteryTone(0.8, false)).toBe('good');
    expect(batteryTone(0.35, false)).toBe('fair');
    expect(batteryTone(0.12, false)).toBe('poor');
    expect(batteryTone(0.12, true)).toBe('good');
    expect(batteryTone(null, null)).toBe('neutral');
  });

  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 hr');
    expect(formatMinutes(310.4)).toBe('5 hr 10 min');
    expect(formatMinutes(-3)).toBe('0 min');
  });

  it('labels the estimate by charge state', () => {
    expect(batteryEstimate(310, false, 0.6)).toEqual({
      label: 'Time left',
      value: 'About 5 hr 10 min',
    });
    expect(batteryEstimate(50, true, 0.6)).toEqual({
      label: 'Time to full',
      value: 'About 50 min',
    });
    expect(batteryEstimate(480, true, 1)).toEqual({
      label: 'Charging',
      value: 'Full',
    });
    expect(batteryEstimate(null, false, 0.6)).toEqual({
      label: 'Time left',
      value: 'Calculating…',
    });
  });
});

describe('connectionSummary', () => {
  it('reports checking before NetInfo answers', () => {
    expect(connectionSummary(null)).toMatchObject({
      status: 'Checking…',
      tone: 'neutral',
    });
    expect(
      connectionSummary({ type: 'wifi', isConnected: null }),
    ).toMatchObject({ status: 'Checking…', tone: 'neutral' });
  });

  it('describes Wi-Fi with signal strength', () => {
    expect(
      connectionSummary({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: { strength: 71.6, isConnectionExpensive: false },
      }),
    ).toEqual({
      status: 'Online',
      tone: 'good',
      connection: 'Wi-Fi',
      carrier: null,
      signal: 72,
      metered: false,
    });
  });

  it('describes cellular with generation and carrier', () => {
    expect(
      connectionSummary({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: {
          cellularGeneration: '5g',
          carrier: 'Verizon',
          isConnectionExpensive: true,
        },
      }),
    ).toMatchObject({
      connection: 'Cellular · 5G',
      carrier: 'Verizon',
      signal: null,
      metered: true,
    });
  });

  it('calls out a connection that cannot reach the internet', () => {
    expect(
      connectionSummary({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: false,
      }),
    ).toMatchObject({ status: 'Connected, no internet', tone: 'fair' });
  });

  it('is offline with no connection type', () => {
    expect(
      connectionSummary({ type: 'none', isConnected: false, details: null }),
    ).toMatchObject({ status: 'Offline', tone: 'poor', connection: 'None' });
  });
});
