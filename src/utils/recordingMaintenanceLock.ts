let tail: Promise<void> = Promise.resolve();

/** Serialize recording cleanup with operations that create note references. */
export async function withRecordingMaintenanceLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous = tail;
  let release: () => void = () => {};
  tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}
