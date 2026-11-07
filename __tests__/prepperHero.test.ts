import {
  expiryCounts,
  expiryHeadline,
} from '../src/modules/Prepper/prepperHero';
import type { PantryItem } from '../src/stores/PantryStore';

const item = (name: string, month?: number, year?: number): PantryItem => ({
  id: name,
  name,
  category: 'Canned',
  quantity: 1,
  expirationMonth: month,
  expirationYear: year,
  createdAt: 0,
  updatedAt: 0,
});

/** Days left per item, as the store would report them. */
const days =
  (table: Record<string, number | null>) =>
  (entry: PantryItem): number | null =>
    table[entry.name] ?? null;

describe('expiryHeadline', () => {
  it('names the next item and when to use it by', () => {
    const beans = item('Canned beans', 11, 2026);
    const result = expiryHeadline(
      [beans, item('Rice', 6, 2027)],
      days({ 'Canned beans': 23, Rice: 230 }),
    );
    expect(result.headline).toBe('Canned beans');
    expect(result.detail).toMatch(/^Use by end of Nov 2026 · 23 days left$/);
    expect(result.tone).toBe('fair');
  });

  it('flags an expired item in red, with how many more have expired', () => {
    const result = expiryHeadline(
      [
        item('Milk powder', 9, 2026),
        item('Crackers', 10, 2026),
        item('Rice', 6, 2027),
      ],
      days({ 'Milk powder': -60, Crackers: -30, Rice: 230 }),
    );
    expect(result).toMatchObject({ headline: 'Milk powder', tone: 'poor' });
    expect(result.detail).toMatch(/^Expired Sep 2026 · 1 more expired$/);
  });

  it('is calm when nothing near expires, and explains when nothing is dated', () => {
    expect(
      expiryHeadline([item('Rice', 6, 2027)], days({ Rice: 230 })).tone,
    ).toBeUndefined();
    expect(expiryHeadline([], days({}))).toMatchObject({
      headline: 'No expiry dates yet',
      tone: 'muted',
    });
  });

  it('does not mark an item expired until the end of its expiry month', () => {
    const cannedFood = item('Canned food', 10, 2026);
    const daysRemaining = days({ 'Canned food': 0 });
    const beforeMonthEnd = new Date(2026, 9, 31, 23, 59, 59, 998);
    const afterMonthEnd = new Date(2026, 10, 1);

    expect(
      expiryHeadline([cannedFood], daysRemaining, beforeMonthEnd).detail,
    ).toMatch(/^Use by end of Oct 2026 · 0 days left$/);
    expect(
      expiryHeadline([cannedFood], daysRemaining, afterMonthEnd).detail,
    ).toBe('Expired Oct 2026');
  });
});

describe('expiryCounts', () => {
  it('counts expired and within-30-days separately, skipping undated', () => {
    expect(
      expiryCounts(
        [
          item('A', 9, 2026),
          item('B', 10, 2026),
          item('C', 11, 2026),
          item('D', 12, 2026),
          item('Undated'),
        ],
        days({ A: -3, B: 10, C: 30, D: 31 }),
        new Date(2026, 9, 1),
      ),
    ).toEqual({ expired: 1, soon: 2 });
  });

  it('uses the exact expiry instant instead of rounded days', () => {
    const cannedFood = item('Canned food', 10, 2026);
    const daysRemaining = days({ 'Canned food': 0 });

    expect(
      expiryCounts(
        [cannedFood],
        daysRemaining,
        new Date(2026, 9, 31, 23, 59, 59, 998),
      ),
    ).toEqual({ expired: 0, soon: 1 });
    expect(
      expiryCounts([cannedFood], daysRemaining, new Date(2026, 10, 1)),
    ).toEqual({ expired: 1, soon: 0 });
  });
});
