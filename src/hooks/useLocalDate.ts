import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, re-read at each local midnight and whenever the app
 * returns to the foreground, for readouts that depend on the calendar day
 * ("Today, 9:41", a character of the day) rather than on the minute.
 *
 * Like `useCurrentDate`, it waits for midnight rather than polling.
 */
export function useLocalDate(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const current = new Date();
      const midnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, midnight.getTime() - current.getTime());
    };
    schedule();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(new Date());
      if (timer !== null) clearTimeout(timer);
      schedule();
    });

    return () => {
      if (timer !== null) clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return now;
}
