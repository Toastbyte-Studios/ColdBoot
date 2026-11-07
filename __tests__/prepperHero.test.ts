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
});

describe('expiryCounts', () => {
  it('counts expired and within-30-days separately, skipping undated', () => {
    expect(
      expiryCounts(
        [item('A'), item('B'), item('C'), item('D')],
        days({ A: -3, B: 10, C: 30, D: 31 }),
      ),
    ).toEqual({ expired: 1, soon: 2 });
  });
});
