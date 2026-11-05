export type SensorPresence = 'present' | 'absent' | 'unknown';

/** The shape of a react-native-sensors observable, as far as a probe needs. */
type Subscribable = {
  subscribe: (
    next: (reading: unknown) => void,
    error: (err: unknown) => void,
  ) => { unsubscribe: () => void };
};

/**
 * Whether a sensor exists, found by listening briefly: react-native-sensors
 * errors straight away for hardware the device lacks, and emits readings for
 * hardware it has. Silence until the timeout reads as unknown rather than
 * absent, so a slow first reading doesn't get a working sensor written off.
 */
export function probeSensor(
  sensor: Subscribable,
  timeoutMs = 2000,
): Promise<SensorPresence> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (presence: SensorPresence) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      // Unsubscribing inside the subscribe call itself would run before
      // `subscription` is assigned; defer it a tick.
      setTimeout(() => subscription?.unsubscribe(), 0);
      resolve(presence);
    };

    timer = setTimeout(() => settle('unknown'), timeoutMs);
    try {
      subscription = sensor.subscribe(
        () => settle('present'),
        () => settle('absent'),
      );
    } catch {
      settle('absent');
    }
  });
}
