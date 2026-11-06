import { NativeModules, Platform } from 'react-native';
import type { MeasurementSystem } from '../stores/SettingsStore';

/**
 * The battery's temperature in °C, or null where it can't be read.
 *
 * Android reports it (BatteryTemperatureModule reads the sticky
 * ACTION_BATTERY_CHANGED broadcast). iOS has no public API for it, so this is
 * always null there and the UI leaves the reading out.
 */
export async function readBatteryTemperature(): Promise<number | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const value: unknown =
      await NativeModules.BatteryTemperature?.getTemperature?.();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Lithium-ion must not be charged at or below this (lithium plating). */
export const NO_CHARGE_BELOW_C = 0;
/** Below this the battery sags noticeably and can shut the phone off. */
export const COLD_BELOW_C = 5;
/** Lithium-ion charging limit at the hot end. */
export const TOO_HOT_FROM_C = 45;

export type BatteryTemperatureStatus = {
  tone: 'good' | 'fair' | 'poor';
  /** Short state: "Normal", "Cold", "Too cold to charge", "Hot". */
  label: string;
  /** What to do about it, when anything. */
  advice?: string;
};

/**
 * What a battery temperature means for the user. The thresholds are
 * lithium-ion's: no charging at or below 0 °C (it plates lithium onto the
 * anode, which is permanent), reduced capacity in the cold, and no charging
 * above 45 °C.
 */
export function batteryTemperatureStatus(
  celsius: number,
): BatteryTemperatureStatus {
  if (celsius <= NO_CHARGE_BELOW_C) {
    return {
      tone: 'poor',
      label: 'Too cold to charge',
      advice:
        "Don't plug it in until it warms up. Keep it inside your clothes, against your body.",
    };
  }
  if (celsius < COLD_BELOW_C) {
    return {
      tone: 'fair',
      label: 'Cold',
      advice:
        'The battery drains faster and can switch the phone off. Keep it in an inside pocket.',
    };
  }
  if (celsius >= TOO_HOT_FROM_C) {
    return {
      tone: 'poor',
      label: 'Hot',
      advice: "Let it cool in the shade before charging. Don't cover it.",
    };
  }
  return { tone: 'good', label: 'Normal' };
}

/** "−3 °C" or "27 °F", in the user's units. */
export function formatTemperature(
  celsius: number,
  system: MeasurementSystem,
): string {
  const value =
    system === 'imperial'
      ? Math.round((celsius * 9) / 5 + 32)
      : Math.round(celsius);
  const unit = system === 'imperial' ? '°F' : '°C';
  // A true minus sign reads better than a hyphen next to a number.
  return `${value < 0 ? '−' : ''}${Math.abs(value)} ${unit}`;
}
