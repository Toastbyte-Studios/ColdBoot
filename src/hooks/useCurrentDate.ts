import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

const DATE_FORMAT = 'dddd, MMMM D';

/**
 * Today's date, formatted for the app bar's supporting line.
 *
 * Rolls over exactly at midnight rather than on an interval: the value only
 * ever changes once a day, and a polling timer would either be wasteful or
 * leave a stale date on screen for up to its own period.
 *
 * Lives in a hook because the two platforms render it in different places —
 * inside the bar on iOS, in the scrolling content on Android — so neither one
 * can own the timer.
 */
export function useCurrentDate(): string {
  const [currentDate, setCurrentDate] = useState(() =>
    dayjs().format(DATE_FORMAT),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleNextUpdate = () => {
      const now = dayjs();
      const tomorrow = now.add(1, 'day').startOf('day');

      timeoutRef.current = setTimeout(() => {
        setCurrentDate(dayjs().format(DATE_FORMAT));
        scheduleNextUpdate();
      }, tomorrow.diff(now));
    };

    scheduleNextUpdate();

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return currentDate;
}
