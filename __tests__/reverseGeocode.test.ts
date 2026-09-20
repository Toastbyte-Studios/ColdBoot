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

  it('aborts when the caller-provided signal aborts', async () => {
    const controller = new AbortController();
    const addSpy = jest.spyOn(controller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

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

    const promise = reverseGeocode(36.17, -115.13, {
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    controller.abort();

    await expect(promise).resolves.toBeNull();
    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('returns null without starting fetch when given an already-aborted signal', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    const controller = new AbortController();
    controller.abort();

    await expect(
      reverseGeocode(36.17, -115.13, {
        signal: controller.signal,
      }),
    ).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('buildOfflineAreaFallbackName', () => {
  it('builds the fallback date-based name', () => {
    const date = new Date('2026-09-20T00:00:00.000Z');
    expect(buildOfflineAreaFallbackName(date)).toMatch(/^Area Download /);
  });
});
