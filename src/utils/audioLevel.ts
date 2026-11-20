/**
 * The level `normalizeMeteringLevel` gives a loud reading (-10 dBFS and up).
 * Kept below 100 so a normal speaking voice doesn't sit at the ceiling; the
 * waveform scales its bars to this, not to 100.
 */
export const METERING_FULL_SCALE = 75;

/**
 * Normalises a recorder metering reading to a 0-100 scale.
 *
 * `react-native-nitro-sound` reports metering in dBFS on both platforms:
 * -160 (silence) to 0 (the loudest the microphone can capture). iOS averages
 * power over the update window; Android takes `MediaRecorder`'s peak
 * amplitude since the last reading and converts it with 20·log10. Both are
 * mapped the same way here, for the Voice Log recorder's waveform. (The
 * decibel meter works in dB itself; see `utils/soundLevel`.)
 *
 * (Android used to be treated as a raw 0-32767 amplitude. The library has
 * reported dBFS there for a while, so every reading went negative and the
 * bars sat at zero.)
 *
 * @param metering - `currentMetering` from a record-back event, in dBFS.
 *   Undefined or null is treated as silence.
 * @returns A level from 0 (silence) to `METERING_FULL_SCALE` (loud).
 */
export function normalizeMeteringLevel(metering: number | undefined): number {
  const raw = metering ?? -160;
  // -80 dBFS (quiet room) to -10 dBFS (loud).
  const adjusted = Math.max(-80, Math.min(-10, raw));
  const level = ((adjusted + 80) / 70) * METERING_FULL_SCALE;

  if (!isFinite(level)) {
    return 0;
  }
  return Math.max(0, Math.min(100, level));
}

/** How much recording time one waveform bar covers. */
export const WAVEFORM_BUCKET_MS = 200;

/**
 * Adds a metering reading to a recording's waveform.
 *
 * The waveform is one level per `bucketMs` of recording, so it has a fixed
 * number of bars for a given length whatever rate the recorder reports at. A
 * bucket keeps the loudest reading that lands in it: speech is peaky, and an
 * average flattens it into a smear. Buckets skipped by a late update are
 * filled as silence.
 *
 * @param samples - The waveform so far.
 * @param positionMs - The recorder's position for this reading.
 * @param level - The reading, from `normalizeMeteringLevel`.
 * @param bucketMs - Recording time per bar.
 * @returns The updated waveform, or `samples` itself if nothing changed.
 */
export function addWaveformSample(
  samples: readonly number[],
  positionMs: number,
  level: number,
  bucketMs: number = WAVEFORM_BUCKET_MS,
): readonly number[] {
  if (!isFinite(positionMs) || positionMs < 0 || !isFinite(level)) {
    return samples;
  }
  const index = Math.floor(positionMs / bucketMs);
  const current = samples[index];
  if (current !== undefined && current >= level) return samples;

  const next = samples.slice();
  for (let i = samples.length; i < index; i++) next[i] = 0;
  next[index] = Math.max(current ?? 0, level);
  return next;
}
