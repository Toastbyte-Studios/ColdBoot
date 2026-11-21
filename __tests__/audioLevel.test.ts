/**
 * @format
 */

import { Platform } from 'react-native';
import {
  addWaveformSample,
  METERING_FULL_SCALE,
  normalizeMeteringLevel,
  parseStoredWaveform,
  serializeWaveform,
  WAVEFORM_BUCKET_MS,
} from '../src/utils/audioLevel';

describe('normalizeMeteringLevel', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  const setPlatform = (os: 'ios' | 'android') => {
    Object.defineProperty(Platform, 'OS', { value: os });
  };

  test('treats a missing reading as silence', () => {
    setPlatform('ios');
    expect(normalizeMeteringLevel(undefined)).toBe(0);
  });

  test('iOS: quiet is 0, loud is at the top of the scale', () => {
    setPlatform('ios');
    expect(normalizeMeteringLevel(-160)).toBe(0);
    expect(normalizeMeteringLevel(-80)).toBe(0);
    expect(normalizeMeteringLevel(-10)).toBeCloseTo(75, 5);
    expect(normalizeMeteringLevel(0)).toBeCloseTo(75, 5);
  });

  test('iOS: speech sits in the middle of the scale', () => {
    setPlatform('ios');
    const level = normalizeMeteringLevel(-45);
    expect(level).toBeGreaterThan(20);
    expect(level).toBeLessThan(60);
  });

  test('Android: reads dBFS on the same scale as iOS', () => {
    setPlatform('android');
    expect(normalizeMeteringLevel(-160)).toBe(0);
    expect(normalizeMeteringLevel(-80)).toBe(0);
    expect(normalizeMeteringLevel(-10)).toBeCloseTo(75, 5);
    setPlatform('ios');
    const ios = normalizeMeteringLevel(-45);
    setPlatform('android');
    expect(normalizeMeteringLevel(-45)).toBe(ios);
  });

  test('Android: a speaking-level reading is not stuck at zero', () => {
    setPlatform('android');
    expect(normalizeMeteringLevel(-30)).toBeGreaterThan(40);
  });

  test('never leaves the 0-100 range', () => {
    for (const os of ['ios', 'android'] as const) {
      setPlatform(os);
      for (const value of [-1000, -160, 0, 50, 16000, 1e9, NaN]) {
        const level = normalizeMeteringLevel(value);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('addWaveformSample', () => {
  test('puts a reading in the bar for its position', () => {
    const samples = addWaveformSample([], WAVEFORM_BUCKET_MS * 2 + 50, 40);
    expect(samples).toEqual([0, 0, 40]);
  });

  test('keeps the loudest reading in a bar', () => {
    let samples = addWaveformSample([], 10, 30);
    samples = addWaveformSample(samples, 120, 60);
    samples = addWaveformSample(samples, 180, 20);
    expect(samples).toEqual([60]);
  });

  test('returns the same array when nothing changes', () => {
    const samples = addWaveformSample([], 10, 50);
    expect(addWaveformSample(samples, 20, 10)).toBe(samples);
    expect(addWaveformSample(samples, -5, 10)).toBe(samples);
    expect(addWaveformSample(samples, NaN, 10)).toBe(samples);
    expect(addWaveformSample(samples, 20, NaN)).toBe(samples);
  });

  test('does not change the array it was given', () => {
    const samples = [10];
    addWaveformSample(samples, WAVEFORM_BUCKET_MS, 50);
    expect(samples).toEqual([10]);
  });

  test('a full-scale reading is what the waveform scales to', () => {
    expect(normalizeMeteringLevel(0)).toBeCloseTo(METERING_FULL_SCALE, 5);
  });
});

describe('stored waveforms', () => {
  test('round-trip as whole numbers', () => {
    const stored = serializeWaveform([1.4, 2.6, 75]);
    expect(stored).toBe('[1,3,75]');
    expect(parseStoredWaveform(stored)).toEqual([1, 3, 75]);
  });

  test('none is stored as null', () => {
    expect(serializeWaveform(undefined)).toBeNull();
    expect(serializeWaveform([])).toBeNull();
  });

  test.each([null, undefined, 5, '', 'x', '{}', '[]', '[1,null]', '[1,"2"]'])(
    'reads %p as none',
    (raw) => {
      expect(parseStoredWaveform(raw)).toBeUndefined();
    },
  );

  test('caps a very long waveform', () => {
    const long = Array.from({ length: 1000 }, () => 1);
    expect(JSON.parse(serializeWaveform(long)!)).toHaveLength(600);
    expect(parseStoredWaveform(JSON.stringify(long))).toHaveLength(600);
  });
});
