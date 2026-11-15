import {
  LIVE_POLYLINE_EXACT_TAIL,
  LIVE_POLYLINE_MAX_POINTS,
  livePolylinePoints,
} from '../src/screens/Map/livePolyline';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('livePolylinePoints', () => {
  it('returns a short trail unchanged, as a copy', () => {
    const points = range(10);
    const drawn = livePolylinePoints(points);

    expect(drawn).toEqual(points);
    expect(drawn).not.toBe(points);
    expect(livePolylinePoints([])).toEqual([]);
  });

  it('draws every point up to the cap', () => {
    const points = range(LIVE_POLYLINE_MAX_POINTS);
    expect(livePolylinePoints(points)).toEqual(points);
  });

  it('never draws more than the cap, however long the trail', () => {
    for (const length of [1001, 2500, 10_000, 50_000]) {
      expect(livePolylinePoints(range(length))).toHaveLength(
        LIVE_POLYLINE_MAX_POINTS,
      );
    }
  });

  it('keeps the start, the newest points exactly, and the order', () => {
    const drawn = livePolylinePoints(range(10_000));

    expect(drawn[0]).toBe(0);
    expect(drawn.slice(-LIVE_POLYLINE_EXACT_TAIL)).toEqual(
      range(10_000).slice(-LIVE_POLYLINE_EXACT_TAIL),
    );
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b));
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it('thins the older stretch evenly', () => {
    // 10 older points into a budget of 5: every second one.
    expect(livePolylinePoints(range(13), 8, 3)).toEqual([
      0, 2, 4, 6, 8, 10, 11, 12,
    ]);
  });

  it('copes with a tail as large as the cap', () => {
    const drawn = livePolylinePoints(range(20), 5, 5);

    expect(drawn).toHaveLength(5);
    expect(drawn[0]).toBe(0);
    expect(drawn.slice(1)).toEqual([16, 17, 18, 19]);
  });
});
