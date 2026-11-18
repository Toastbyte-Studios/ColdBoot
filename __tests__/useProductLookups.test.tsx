/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useProductLookups } from '../src/screens/Pantry/scan/useProductLookups';
import {
  LookupCancelledError,
  LookupQueue,
  LookupResult,
  sharedLookupQueue,
} from '../src/services/productLookup';

type Hook = ReturnType<typeof useProductLookups>;

/** A queue whose tasks start only when the test says so. */
class ManualQueue extends LookupQueue {
  private waiting: (() => void)[] = [];

  run<T>(
    task: () => Promise<T>,
    shouldRun: () => boolean = () => true,
  ): Promise<T> {
    return new Promise<void>((resolve) => this.waiting.push(resolve)).then(
      () => (shouldRun() ? task() : Promise.reject(new LookupCancelledError())),
    );
  }

  releaseAll() {
    this.waiting.splice(0).forEach((start) => start());
  }
}

type HookOptions = Parameters<typeof useProductLookups>[0];

function renderHook(
  options: Partial<HookOptions> & {
    lookup: (barcode: string) => Promise<LookupResult>;
  },
) {
  const result: { current?: Hook } = {};
  function Probe(props: HookOptions) {
    result.current = useProductLookups(props);
    return null;
  }
  let props: HookOptions = { enabled: true, online: true, ...options };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Probe {...props} />);
  });
  /** Re-renders with some options changed, as a store change would. */
  const rerender = async (changes: Partial<HookOptions>) => {
    props = { ...props, ...changes };
    await ReactTestRenderer.act(async () => {
      tree.update(<Probe {...props} />);
    });
  };
  return { result: result as { current: Hook }, tree, rerender };
}

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const BARCODE = '0036000291452';

describe('useProductLookups', () => {
  it('drops queued lookups when the screen closes', async () => {
    const queue = new ManualQueue();
    const lookup = jest.fn(
      async (): Promise<LookupResult> => ({ status: 'not-found' }),
    );
    const { result, tree } = renderHook({ lookup, queue });

    ReactTestRenderer.act(() => result.current.request('0036000291452'));
    expect(result.current.states['0036000291452']).toEqual({
      status: 'pending',
    });

    ReactTestRenderer.act(() => tree.unmount());
    await ReactTestRenderer.act(async () => queue.releaseAll());

    expect(lookup).not.toHaveBeenCalled();
  });

  it('asks about each barcode once', async () => {
    const lookup = jest.fn(
      async (): Promise<LookupResult> => ({ status: 'not-found' }),
    );
    const { result } = renderHook({ lookup, queue: new LookupQueue(0) });

    await ReactTestRenderer.act(async () => {
      result.current.request('0036000291452');
      result.current.request('0036000291452');
    });
    await ReactTestRenderer.act(async () => {
      result.current.request('0036000291452');
    });

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(result.current.states['0036000291452']).toEqual({
      status: 'not-found',
    });
  });

  it('does nothing and reports nothing when turned off', async () => {
    const lookup = jest.fn();
    const { result } = renderHook({ lookup, enabled: false });

    await ReactTestRenderer.act(async () => {
      result.current.request('0036000291452');
    });

    expect(lookup).not.toHaveBeenCalled();
    expect(result.current.states).toEqual({});
  });

  it('withdraws queued lookups when turned off, and can ask again later', async () => {
    const queue = new ManualQueue();
    const lookup = jest.fn(
      async (): Promise<LookupResult> => ({ status: 'not-found' }),
    );
    const { result, rerender } = renderHook({ lookup, queue });

    ReactTestRenderer.act(() => result.current.request(BARCODE));
    // Settings opens over the scan screen and lookups are turned off.
    await rerender({ enabled: false });
    await ReactTestRenderer.act(async () => queue.releaseAll());

    expect(lookup).not.toHaveBeenCalled();

    // Turned back on: the barcode was forgotten, so it can be asked again.
    await rerender({ enabled: true });
    expect(result.current.states[BARCODE]).toBeUndefined();
    ReactTestRenderer.act(() => result.current.request(BARCODE));
    await ReactTestRenderer.act(async () => queue.releaseAll());
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('uses the app-wide queue by default', () => {
    const run = jest
      .spyOn(sharedLookupQueue, 'run')
      .mockReturnValue(new Promise(() => {}));
    const { result } = renderHook({ lookup: jest.fn() });

    ReactTestRenderer.act(() => result.current.request(BARCODE));

    expect(run).toHaveBeenCalledTimes(1);
    run.mockRestore();
  });

  it('retries once when a lookup fails after the connection came back', async () => {
    const first = deferred<LookupResult>();
    const lookup = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ status: 'not-found' });
    const { result, rerender } = renderHook({
      lookup,
      queue: new LookupQueue(0),
    });

    await ReactTestRenderer.act(async () => result.current.request(BARCODE));
    // The connection drops and returns while the request is still out.
    await rerender({ online: false });
    await rerender({ online: true });
    await ReactTestRenderer.act(async () => {
      first.reject(new Error('Network request failed'));
    });

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.current.states[BARCODE]).toEqual({ status: 'not-found' });
  });

  it('waits for a reconnect after an ordinary failure', async () => {
    const lookup = jest.fn().mockRejectedValue(new Error('503'));
    const { result } = renderHook({ lookup, queue: new LookupQueue(0) });

    await ReactTestRenderer.act(async () => result.current.request(BARCODE));

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(result.current.states[BARCODE]).toEqual({ status: 'unavailable' });
  });

  it('asks again when a failed barcode is scanned again online', async () => {
    const lookup = jest
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ status: 'not-found' });
    const { result } = renderHook({ lookup, queue: new LookupQueue(0) });

    await ReactTestRenderer.act(async () => result.current.request(BARCODE));
    await ReactTestRenderer.act(async () => result.current.request(BARCODE));

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.current.states[BARCODE]).toEqual({ status: 'not-found' });
  });

  it('does not ask again for a failed barcode scanned while offline', async () => {
    const lookup = jest.fn();
    const { result } = renderHook({
      lookup,
      online: false,
      queue: new LookupQueue(0),
    });

    await ReactTestRenderer.act(async () => {
      result.current.request(BARCODE);
      result.current.request(BARCODE);
    });

    expect(lookup).not.toHaveBeenCalled();
    expect(result.current.states[BARCODE]).toEqual({ status: 'unavailable' });
  });
});
