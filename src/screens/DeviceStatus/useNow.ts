import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `intervalMs`, for readouts that age while
 * the screen is open ("Just now" becoming "3 min ago").
 */
export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
