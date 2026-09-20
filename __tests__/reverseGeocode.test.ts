import {
  buildOfflineAreaFallbackName,
  reverseGeocode,
} from '../src/utils/reverseGeocode';

describe('reverseGeocode', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns parsed names on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Red Rock Canyon',
        address: {
          city: 'Las Vegas',
          state: 'Nevada',
        },
      }),
    } as Response);

    await expect(reverseGeocode(36.17, -115.13)).resolves.toEqual({
      compassName: 'Las Vegas, NV',
      areaName: 'Red Rock Canyon',
    });
  });

  it('returns null for non-OK responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);

    await expect(reverseGeocode(36.17, -115.13)).resolves.toBeNull();
  });

  it('returns null on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(reverseGeocode(36.17, -115.13)).resolves.toBeNull();
  });

  it('returns null when timeout aborts the request', async () => {
    jest.useFakeTimers();
    global.fetch = jest
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
      });

    const promise = reverseGeocode(36.17, -115.13, { timeoutMs: 5 });
    jest.advanceTimersByTime(10);

    await expect(promise).resolves.toBeNull();
  });
});

describe('buildOfflineAreaFallbackName', () => {
  it('builds the fallback date-based name', () => {
    const date = new Date('2026-09-20T00:00:00.000Z');
    expect(buildOfflineAreaFallbackName(date)).toMatch(/^Area Download /);
  });
});
