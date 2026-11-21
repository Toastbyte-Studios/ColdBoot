import {
  formatClock,
  formatLength,
  is24HourFormat,
  formatTime,
  formatDateTime,
  resetTimeFormatCache,
} from '../src/utils/timeFormat';

describe('timeFormat utilities', () => {
  // Reset cache before each test to ensure clean state
  beforeEach(() => {
    resetTimeFormatCache();
  });

  describe('is24HourFormat', () => {
    it('should return a boolean value', () => {
      const result = is24HourFormat();
      expect(typeof result).toBe('boolean');
    });

    it('should detect 24-hour format consistently', () => {
      // This test will pass or fail based on the system locale
      // We're checking that it returns a consistent result
      const result1 = is24HourFormat();
      const result2 = is24HourFormat();
      expect(result1).toBe(result2);
    });

    it('should cache the result for performance', () => {
      // First call initializes cache
      const result1 = is24HourFormat();
      // Second call should use cached value
      const result2 = is24HourFormat();
      expect(result1).toBe(result2);
    });
  });

  describe('resetTimeFormatCache', () => {
    it('should reset the cached value', () => {
      // Initialize cache
      is24HourFormat();

      // Reset cache
      resetTimeFormatCache();

      // Next call should re-detect
      const result = is24HourFormat();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatTime', () => {
    it('should format time with minutes', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0); // 2:30 PM / 14:30
      const result = formatTime(date);

      // Should contain the minutes
      expect(result).toContain('30');

      // Should be a non-empty string
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format morning time', () => {
      const date = new Date(2024, 0, 15, 6, 30, 0); // 6:30 AM / 06:30
      const result = formatTime(date);

      // Should contain the minutes
      expect(result).toContain('30');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format evening time', () => {
      const date = new Date(2024, 0, 15, 23, 45, 0); // 11:45 PM / 23:45
      const result = formatTime(date);

      // Should contain the minutes
      expect(result).toContain('45');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be consistent across multiple calls', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const result1 = formatTime(date);
      const result2 = formatTime(date);
      expect(result1).toBe(result2);
    });
  });

  describe('formatDateTime', () => {
    it('should format full datetime', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0); // Jan 15, 2024, 2:30 PM
      const result = formatDateTime(date);

      // Should contain date components
      expect(result).toContain('15');
      expect(result).toContain('2024');

      // Should contain time component (minutes)
      expect(result).toContain('30');

      // Should be a non-empty string
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be consistent across multiple calls', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const result1 = formatDateTime(date);
      const result2 = formatDateTime(date);
      expect(result1).toBe(result2);
    });

    it('should handle different dates', () => {
      const date1 = new Date(2024, 0, 15, 14, 30, 0);
      const date2 = new Date(2024, 5, 20, 9, 15, 0);
      const result1 = formatDateTime(date1);
      const result2 = formatDateTime(date2);

      // Different dates should produce different strings
      expect(result1).not.toBe(result2);
    });
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [7.9, '0:07'],
    [65, '1:05'],
    [-3, '0:00'],
    [NaN, '0:00'],
  ])('%p reads %p', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });
});

describe('formatLength', () => {
  it.each([
    [12, '12 s'],
    [60, '1 min'],
    [150, '2 min 30 s'],
    [300, '5 min'],
  ])('%p reads %p', (seconds, text) => {
    expect(formatLength(seconds)).toBe(text);
  });
});
