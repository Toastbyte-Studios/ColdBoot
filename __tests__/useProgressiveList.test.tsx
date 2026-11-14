import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useProgressiveList } from '../src/hooks/useProgressiveList';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('useProgressiveList', () => {
  // Pending frame callbacks by handle, as the real API keeps them.
  let frames: Map<number, (time: number) => void>;
  let nextHandle: number;
  let raf: jest.SpyInstance;
  let cancel: jest.SpyInstance;
  let shown: readonly number[];

  function Probe({ items }: { items: readonly number[] }) {
    shown = useProgressiveList(items);
    return null;
  }

  /** Runs every frame callback queued so far. */
  async function nextFrame() {
    const due = [...frames.values()];
    frames.clear();
    await ReactTestRenderer.act(async () => {
      due.forEach((callback) => callback(0));
    });
  }

  async function mount(items: readonly number[]) {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<Probe items={items} />);
    });
    return tree;
  }

  beforeEach(() => {
    frames = new Map();
    nextHandle = 0;
    raf = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        nextHandle += 1;
        frames.set(nextHandle, callback);
        return nextHandle;
      });
    cancel = jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation((handle) => {
        frames.delete(handle);
      });
  });

  afterEach(() => {
    raf.mockRestore();
    cancel.mockRestore();
  });

  it('returns a short list as it is, with no frames scheduled', async () => {
    const items = range(12);
    await mount(items);

    expect(shown).toBe(items);
    expect(frames.size).toBe(0);
  });

  it('shows the first batch at once and the rest over later frames', async () => {
    const items = range(200);
    await mount(items);
    expect(shown).toEqual(range(30));

    await nextFrame();
    expect(shown).toEqual(range(90));

    await nextFrame();
    expect(shown).toEqual(range(150));

    await nextFrame();
    expect(shown).toBe(items);

    // Nothing left to schedule once the whole list is out.
    expect(frames.size).toBe(0);
  });

  it('carries on when the list grows and copes when it shrinks', async () => {
    const tree = await mount(range(40));
    await nextFrame();
    expect(shown).toHaveLength(40);

    const shorter = range(5);
    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={shorter} />);
    });
    expect(shown).toBe(shorter);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={range(500)} />);
    });
    // Everything already shown stays; the new rows arrive in batches.
    expect(shown).toHaveLength(40);
    await nextFrame();
    expect(shown).toHaveLength(100);
  });

  it('cancels a pending frame on unmount', async () => {
    const tree = await mount(range(200));
    expect(frames.size).toBe(1);

    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });

    expect(frames.size).toBe(0);
  });
});
