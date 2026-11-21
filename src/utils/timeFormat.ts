/**
 * Utility functions for formatting time based on user's device settings.
 * Automatically detects whether the user prefers 12-hour or 24-hour format.
 */

import * as RNLocalize from 'react-native-localize';

// Cache the 24-hour format detection result since it rarely changes during app session
let cachedIs24Hour: boolean | null = null;

/**
 * Detects if the user's device is set to use 24-hour time format.
 * This uses react-native-localize to check the device's time format setting.
 * The result is cached for performance.
 *
 * @returns true if the device uses 24-hour format, false for 12-hour format
 */
export function is24HourFormat(): boolean {
  // Return cached value if available
  if (cachedIs24Hour !== null) {
    return cachedIs24Hour;
  }

  try {
    // Use RNLocalize.uses24HourClock() to get the device's actual 24-hour setting
    const is24Hour = RNLocalize.uses24HourClock();
    cachedIs24Hour = is24Hour;
    return is24Hour;
  } catch (error) {
    // Fallback: try to detect from locale formatting
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric',
      });

      const testDate = new Date(2000, 0, 1, 13, 0, 0);
      const formatted = formatter.format(testDate);

      const is24Hour = formatted.includes('13');
      cachedIs24Hour = is24Hour;
      return is24Hour;
    } catch (fallbackError) {
      // Default to 12-hour format if all detection fails
      console.warn(
        'Failed to detect time format preference:',
        error,
        fallbackError,
      );
      cachedIs24Hour = false;
      return false;
    }
  }
}

/**
 * Resets the cached 24-hour format detection.
 * Call this if the user's locale preference changes during the app session.
 */
export function resetTimeFormatCache(): void {
  cachedIs24Hour = null;
}

/**
 * Formats a date to a time string respecting the user's device 24-hour preference.
 *
 * @param date - The date to format
 * @returns Formatted time string (e.g., "6:30 AM" or "06:30")
 */
export function formatTime(date: Date): string {
  const use24Hour = is24HourFormat();

  if (use24Hour) {
    // Manual formatting for 24-hour to ensure consistency
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date to a full datetime string respecting the user's device 24-hour preference.
 *
 * @param date - The date to format
 * @returns Formatted datetime string (e.g., "1/15/2024, 6:30 AM" or "1/15/2024, 06:30")
 */
export function formatDateTime(date: Date): string {
  const use24Hour = is24HourFormat();

  // Use locale-aware date formatting to respect user's date format preferences
  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  if (use24Hour) {
    // Manual formatting for 24-hour to ensure consistency
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${dateStr}, ${hours}:${minutes}`;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * A length of time as `m:ss`, the way a recorder or player shows it.
 *
 * @param totalSeconds - Seconds; fractions are dropped, negatives read 0:00.
 */
export function formatClock(totalSeconds: number): string {
  const seconds = isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
