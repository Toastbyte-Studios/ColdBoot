/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useProductLookups } from '../src/screens/Pantry/scan/useProductLookups';
import { LookupQueue, LookupResult } from '../src/services/productLookup';

type Hook = ReturnType<typeof useProductLookups>;

/** A queue whose tasks start only when the test says so. */
class ManualQueue extends LookupQueue {
  private waiting: (() => void)[] = [];

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<void>((resolve) => this.waiting.push(resolve)).then(
      task,
    );
  }

  releaseAll() {
    this.waiting.splice(0).forEach((start) => start());
  }
}

function renderHook(
  options: Partial<Parameters<typeof useProductLookups>[0]> & {
    lookup: (barcode: string) => Promise<LookupResult>;
  },
) {
  const result: { current?: Hook } = {};
  function Probe() {
    result.current = useProductLookups({
      enabled: true,
      online: true,
      ...options,
    });
    return null;
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  return { result: result as { current: Hook }, tree };
}

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
});
