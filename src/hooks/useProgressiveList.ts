import { useEffect, useState } from 'react';

/** Rows drawn on the first frame. Enough to fill a screen and then some. */
const FIRST_BATCH = 30;
/** Rows added on each frame after that. */
const NEXT_BATCH = 60;

/**
 * Hands a long list to the screen a batch at a time.
 *
 * These screens draw their rows with `.map()` inside the page's ScrollView,
 * so opening one with a few hundred items mounted every row before the
 * first frame, and the screen sat blank until that finished. This returns
 * the first `FIRST_BATCH` items straight away and the rest over the
 * following frames, so the screen appears at once and fills in as it
 * settles. A list shorter than the first batch is returned untouched.
 *
 * It is not virtualisation: every row is still mounted in the end, and a
 * very long list still costs its full memory. Getting that needs the list
 * to own the page's scrolling (a FlatList in place of StackScreen's
 * ScrollView), which changes the shared page frame.
 */
export function useProgressiveList<T>(items: readonly T[]): readonly T[] {
  const [count, setCount] = useState(FIRST_BATCH);
  const total = items.length;

  useEffect(() => {
    if (count >= total) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setCount((shown) => Math.min(total, shown + NEXT_BATCH));
    });
    return () => cancelAnimationFrame(frame);
  }, [count, total]);

  return count >= total ? items : items.slice(0, count);
}
