import dayjs from 'dayjs';

/**
 * Formats the number of days until a future date as a human-readable string.
 *
 * Counts calendar days in the device's time zone, not 24-hour periods: an
 * event at 9 PM tonight is "Today" even when it is eleven hours away, and one
 * at 1 AM is "Tomorrow" even if it is only two hours off. Rounding elapsed
 * time up (the earlier approach) called anything later today "Tomorrow" and
 * put every other countdown one day high.
 *
 * Examples:
 * - "Today"
 * - "Tomorrow"
 * - "In 5 days"
 * - "In ~2 months"
 * - Falls back to a short date string for dates beyond 12 months
 *
 * @param date - The target future date
 * @param now - The reference time; defaults to the current time
 * @returns A human-readable countdown string
 */
export function formatDaysUntil(date: Date, now: Date = new Date()): string {
  const diffDays = calendarDaysBetween(now, date);
  if (diffDays <= 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 30) {
    return `In ${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `In ~${months} month${months !== 1 ? 's' : ''}`;
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Whole calendar days from `from` to `to` in local time (0 for the same day).
 * Comparing local midnights keeps DST changes, which make one day 23 or 25
 * hours long, from shifting the count.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return dayjs(to).startOf('day').diff(dayjs(from).startOf('day'), 'day');
}
