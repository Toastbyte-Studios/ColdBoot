/**
 * @format
 */

import { Platform } from 'react-native';
import { normalizeMeteringLevel, smoothLevel } from '../src/utils/audioLevel';

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

  test('Android: amplitude scales and caps', () => {
    setPlatform('android');
    expect(normalizeMeteringLevel(0)).toBe(0);
    expect(normalizeMeteringLevel(2400)).toBeCloseTo(10, 5);
    expect(normalizeMeteringLevel(999999)).toBeCloseTo(66.67, 1);
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

describe('smoothLevel', () => {
  test('rises quickly so speech registers straight away', () => {
    expect(smoothLevel(0, 100)).toBeGreaterThan(50);
  });

  test('falls more slowly than it rises', () => {
    const rise = smoothLevel(50, 100) - 50;
    const fall = 50 - smoothLevel(50, 0);
    expect(fall).toBeLessThan(rise);
  });

  test('converges on the target and stays put', () => {
    let level = 0;
    for (let i = 0; i < 40; i++) {
      level = smoothLevel(level, 80);
    }
    expect(level).toBeCloseTo(80, 1);
    expect(smoothLevel(80, 80)).toBeCloseTo(80, 5);
  });
});
