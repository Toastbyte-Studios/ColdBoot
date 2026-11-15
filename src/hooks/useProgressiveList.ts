import { useEffect, useRef, useState } from 'react';

/** Rows drawn on the first frame. Enough to fill a screen and then some. */
const FIRST_BATCH = 30;
/** Rows added on each frame after that. */
const NEXT_BATCH = 60;

function retainsItems<T>(previous: readonly T[], next: readonly T[]): boolean {
  if (previous === next) {
    return true;
  }
  if (next.length < previous.length) {
    return false;
  }

  const remaining = new Map<T, number>();
  for (const item of previous) {
    remaining.set(item, (remaining.get(item) ?? 0) + 1);
  }
  for (const item of next) {
    const count = remaining.get(item);
    if (count === undefined) {
      continue;
    }
    if (count === 1) {
      remaining.delete(item);
    } else {
      remaining.set(item, count - 1);
    }
  }

  return remaining.size === 0;
}

/**
 * Hands a long list to the screen a batch at a time.
 *
 * These screens draw their rows with `.map()` inside the page's ScrollView,
 * so opening one with a few hundred items mounted every row before the
 * first frame, and the screen sat blank until that finished. This returns
 * the first `FIRST_BATCH` items straight away and the rest over the
 * following frames, so the screen appears at once and fills in as it
 * settles. A list shorter than the first batch is returned untouched.
 * Progress is retained when the result only grows; a changed `resetKey` or
 * replacement result starts again at the first batch.
 *
 * It is not virtualisation: every row is still mounted in the end, and a
 * very long list still costs its full memory. Getting that needs the list
 * to own the page's scrolling (a FlatList in place of StackScreen's
 * ScrollView), which changes the shared page frame.
 */
export function useProgressiveList<T>(
  items: readonly T[],
  resetKey?: unknown,
): readonly T[] {
  const [count, setCount] = useState(FIRST_BATCH);
  const previousItems = useRef(items);
  const previousKey = useRef(resetKey);
  const shouldReset =
    !Object.is(previousKey.current, resetKey) ||
    !retainsItems(previousItems.current, items);
  const visibleCount = shouldReset ? FIRST_BATCH : count;
  const total = items.length;

  useEffect(() => {
    if (shouldReset) {
      setCount(FIRST_BATCH);
    }
    previousItems.current = items;
    previousKey.current = resetKey;
  }, [items, resetKey, shouldReset]);

  useEffect(() => {
    if (visibleCount >= total) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setCount((shown) => Math.min(total, shown + NEXT_BATCH));
    });
    return () => cancelAnimationFrame(frame);
  }, [visibleCount, total]);

  return visibleCount >= total ? items : items.slice(0, visibleCount);
}
