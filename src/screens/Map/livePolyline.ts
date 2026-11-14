/** The most points the live trail line is ever drawn with. */
export const LIVE_POLYLINE_MAX_POINTS = 1000;
/** How many of the newest points are always drawn exactly. */
export const LIVE_POLYLINE_EXACT_TAIL = 300;

/**
 * The points to draw for a trail that is still being recorded.
 *
 * The line is redrawn every few fixes, and each redraw hands the whole
 * coordinate list to the native map. With a fix every 5 m, a day's walk is
 * several thousand points, so drawing all of them means re-sending a list
 * that only ever grows: the work done over a recording rises with the
 * square of its length, and it is spent while the phone is on battery.
 *
 * This keeps the cost of a redraw flat. A short trail is returned as it is.
 * A long one keeps its newest `exactTail` points exactly, since that is the
 * part the walker is looking at, and thins everything older evenly so the
 * total never exceeds `maxPoints`. The first point is always kept, so the
 * line still starts where the recording did.
 *
 * Drawing only: the recorded points are untouched, and a saved track is
 * drawn from all of them.
 */
export function livePolylinePoints<T>(
  points: readonly T[],
  maxPoints: number = LIVE_POLYLINE_MAX_POINTS,
  exactTail: number = LIVE_POLYLINE_EXACT_TAIL,
): T[] {
  if (points.length <= maxPoints) {
    return points.slice();
  }
  const tail = Math.min(exactTail, maxPoints - 1);
  const olderCount = points.length - tail;
  const olderBudget = maxPoints - tail;
  const thinned: T[] = [];
  for (let i = 0; i < olderBudget; i++) {
    // Even spacing over the older stretch, starting at the first point.
    thinned.push(points[Math.floor((i * olderCount) / olderBudget)]);
  }
  return thinned.concat(points.slice(olderCount));
}
