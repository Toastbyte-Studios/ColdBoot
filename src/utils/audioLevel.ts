/**
 * Normalises a recorder metering reading to a 0-100 scale.
 *
 * `react-native-nitro-sound` reports metering in dBFS on both platforms:
 * -160 (silence) to 0 (the loudest the microphone can capture). iOS averages
 * power over the update window; Android takes `MediaRecorder`'s peak
 * amplitude since the last reading and converts it with 20·log10. Both are
 * mapped the same way here, for the Voice Log recorder's level bars. (The
 * decibel meter works in dB itself; see `utils/soundLevel`.)
 *
 * (Android used to be treated as a raw 0-32767 amplitude. The library has
 * reported dBFS there for a while, so every reading went negative and the
 * bars sat at zero.)
 *
 * @param metering - `currentMetering` from a record-back event, in dBFS.
 *   Undefined or null is treated as silence.
 * @returns A level from 0 (silence) to 100 (loud).
 */
export function normalizeMeteringLevel(metering: number | undefined): number {
  const raw = metering ?? -160;
  // -80 dBFS (quiet room) to -10 dBFS (loud), scaled to 75% sensitivity.
  const adjusted = Math.max(-80, Math.min(-10, raw));
  const level = ((adjusted + 80) / 70) * 75;

  if (!isFinite(level)) {
    return 0;
  }
  return Math.max(0, Math.min(100, level));
}

/**
 * Smooths a level for display.
 *
 * Metering updates arrive faster than the eye wants to track, and a raw feed
 * flickers. Rising levels are followed almost immediately so the meter feels
 * responsive to speech; falling levels ease back, which reads as a decaying
 * meter rather than a strobe.
 *
 * @param previous - The level currently shown.
 * @param next - The newly measured level.
 * @returns The level to show now.
 */
export function smoothLevel(previous: number, next: number): number {
  const factor = next > previous ? 0.6 : 0.2;
  return previous + (next - previous) * factor;
}
