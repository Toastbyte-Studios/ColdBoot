/**
 * @format
 */

import { fetchSeasonalData } from '../src/services/weatherOutlookService';

// Help's Privacy section tells users Open-Meteo receives only their
// approximate location. These tests hold the request to that promise.
describe('fetchSeasonalData location privacy', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ monthly: { time: ['2024-03-01'] } }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const requestedUrl = () =>
    (global.fetch as jest.Mock).mock.calls[0][0] as string;

  test('sends coordinates rounded to 1 decimal place', async () => {
    await fetchSeasonalData(36.17234, -115.14567);

    const url = requestedUrl();
    expect(url).toContain('latitude=36.2&');
    expect(url).toContain('longitude=-115.1&');
  });

  test('never sends the full-precision coordinates', async () => {
    await fetchSeasonalData(36.17234, -115.14567);

    const url = requestedUrl();
    expect(url).not.toContain('36.17');
    expect(url).not.toContain('115.14');
  });

  test('returns the same rounded coordinates it requested', async () => {
    const outlook = await fetchSeasonalData(36.17234, -115.14567);

    expect(outlook.lat).toBe(36.2);
    expect(outlook.lon).toBe(-115.1);
  });
});
