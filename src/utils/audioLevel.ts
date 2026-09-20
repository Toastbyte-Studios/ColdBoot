import { Platform } from 'react-native';

/**
 * Normalises a recorder metering reading to a 0-100 scale.
 *
 * `react-native-nitro-sound` reports metering differently per platform: iOS
 * gives decibels from -160 (silence) to 0 (max), Android gives a raw
 * amplitude. Both are mapped here so a level of 50 means roughly the same
 * loudness on either platform.
 *
 * The sensitivity constants come from the Decibel Meter screen, which this
 * was extracted from so the meter and the Voice Log recorder read alike.
 *
 * @param metering - `currentMetering` from a record-back event. Undefined or
 *   null is treated as silence.
 * @returns A level from 0 (silence) to 100 (loud).
 */
export function normalizeMeteringLevel(metering: number | undefined): number {
  const raw = metering ?? -160;

  let level: number;
  if (Platform.OS === 'ios') {
    // -80 dB (quiet room) to -10 dB (loud), scaled to 75% sensitivity.
    const adjusted = Math.max(-80, Math.min(-10, raw));
    level = ((adjusted + 80) / 70) * 75;
  } else {
    // Amplitude, capped then scaled to the same 75% sensitivity.
    const adjusted = Math.min(raw, 16000);
    level = adjusted / 240;
  }

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
