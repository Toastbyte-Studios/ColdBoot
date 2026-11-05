import {
  calendarDaysBetween,
  formatDaysUntil,
} from '../src/utils/formatDaysUntil';

// Local-time constructors, so the cases hold in whatever zone the tests run.
const at = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);

const NOW = at(11, 5, 9, 46); // Thu, Nov 5, 9:46 AM

describe('formatDaysUntil', () => {
  it('calls an event later today "Today", however many hours away', () => {
    expect(formatDaysUntil(at(11, 5, 21, 3), NOW)).toBe('Today');
    expect(formatDaysUntil(at(11, 5, 23, 59), NOW)).toBe('Today');
  });

  it('calls an event tomorrow "Tomorrow", even if under a day away', () => {
    expect(formatDaysUntil(at(11, 6, 0, 30), NOW)).toBe('Tomorrow');
    expect(formatDaysUntil(at(11, 6, 23, 0), NOW)).toBe('Tomorrow');
  });

  it('counts calendar days rather than rounding hours up', () => {
    expect(formatDaysUntil(at(11, 25, 0, 0), NOW)).toBe('In 20 days');
    expect(formatDaysUntil(at(11, 25, 23, 0), NOW)).toBe('In 20 days');
  });

  it('switches to months from 30 days out', () => {
    expect(formatDaysUntil(at(12, 4, 12), NOW)).toBe('In 29 days');
    expect(formatDaysUntil(at(12, 5, 12), NOW)).toBe('In ~1 month');
    expect(formatDaysUntil(at(12, 21, 12), NOW)).toBe('In ~1 month');
  });

  it('treats a time already past today as "Today"', () => {
    expect(formatDaysUntil(at(11, 5, 6, 0), NOW)).toBe('Today');
  });
});

describe('calendarDaysBetween', () => {
  it('is unaffected by a DST change in between', () => {
    // US clocks fall back on Nov 1, 2026; EU on Oct 25. Either way the
    // span still counts as whole days.
    expect(calendarDaysBetween(at(10, 20, 12), at(11, 5, 12))).toBe(16);
    expect(calendarDaysBetween(at(3, 1, 23, 30), at(3, 15, 0, 30))).toBe(14);
  });
});
