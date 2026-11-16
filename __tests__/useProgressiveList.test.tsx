import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ProgressiveList from '../src/components/ProgressiveList';
import { useProgressiveList } from '../src/hooks/useProgressiveList';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('useProgressiveList', () => {
  // Pending frame callbacks by handle, as the real API keeps them.
  let frames: Map<number, (time: number) => void>;
  let nextHandle: number;
  let raf: jest.SpyInstance;
  let cancel: jest.SpyInstance;
  let shown: readonly number[];

  function Probe({
    items,
    resetKey,
  }: {
    items: readonly number[];
    resetKey?: unknown;
  }) {
    shown = useProgressiveList(items, resetKey);
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

  it('preserves progress when the result genuinely grows', async () => {
    const tree = await mount(range(40));
    await nextFrame();
    expect(shown).toHaveLength(40);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={range(100)} />);
    });
    expect(shown).toHaveLength(40);

    await nextFrame();
    expect(shown).toHaveLength(100);
  });

  it('restarts batching when the result is replaced', async () => {
    const tree = await mount(range(200));
    await nextFrame();
    await nextFrame();
    await nextFrame();
    expect(shown).toHaveLength(200);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={range(1000).map((item) => item + 500)} />);
    });
    expect(shown).toHaveLength(30);

    await nextFrame();
    expect(shown).toHaveLength(90);
  });

  it('restarts batching when filters change and are cleared', async () => {
    const items = range(200);
    const tree = await mount(items);
    await nextFrame();
    await nextFrame();
    await nextFrame();
    expect(shown).toHaveLength(200);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={items.slice(0, 10)} resetKey="filtered" />);
    });
    expect(shown).toHaveLength(10);

    await ReactTestRenderer.act(async () => {
      tree.update(<Probe items={items} resetKey="all" />);
    });
    expect(shown).toHaveLength(30);
  });

  it('cancels a pending frame on unmount', async () => {
    const tree = await mount(range(200));
    expect(frames.size).toBe(1);

    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });

    expect(frames.size).toBe(0);
  });

  it('only rerenders existing rows when their separator changes', async () => {
    const renderCounts = new Map<number, number>();
    const renderItem = (
      item: { id: string; value: number },
      _index: number,
      isLast: boolean,
    ) => {
      renderCounts.set(item.value, (renderCounts.get(item.value) ?? 0) + 1);
      return <>{`${item.value}:${isLast}`}</>;
    };

    function ListProbe({
      items,
    }: {
      items: readonly { id: string; value: number }[];
    }) {
      const visible = useProgressiveList(items);
      return <ProgressiveList items={visible} renderItem={renderItem} />;
    }
    const items = range(100).map((value) => ({
      id: String(value),
      value,
    }));

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<ListProbe items={items} />);
    });
    expect(renderCounts.size).toBe(30);
    expect(renderCounts.get(0)).toBe(1);
    expect(renderCounts.get(29)).toBe(1);

    await nextFrame();
    expect(renderCounts.size).toBe(90);
    expect(renderCounts.get(0)).toBe(1);
    expect(renderCounts.get(28)).toBe(1);
    expect(renderCounts.get(29)).toBe(2);
    expect(renderCounts.get(30)).toBe(1);
    expect(renderCounts.get(89)).toBe(1);
  });
});
