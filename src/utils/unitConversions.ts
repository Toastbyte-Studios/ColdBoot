/**
 * Unit conversion utilities for the ColdBoot app.
 * Provides two-way conversions for various unit categories.
 */

import { hpaToInhg } from './barometricPressure';
import type { MeasurementSystem } from '../stores/SettingsStore';

export type ConversionCategory = {
  id: string;
  name: string;
  icon: string;
  units: ConversionUnit[];
};

export type ConversionUnit = {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  convert: (value: number) => number;
  reverseConvert: (value: number) => number;
};

// Length / Distance conversions
const lengthConversions: ConversionUnit[] = [
  {
    id: 'inches_cm',
    name: 'Inches ↔ Centimeters',
    fromName: 'Inches',
    toName: 'Centimeters',
    convert: (inches: number) => inches * 2.54,
    reverseConvert: (cm: number) => cm / 2.54,
  },
  {
    id: 'feet_meters',
    name: 'Feet ↔ Meters',
    fromName: 'Feet',
    toName: 'Meters',
    convert: (feet: number) => feet * 0.3048,
    reverseConvert: (meters: number) => meters / 0.3048,
  },
  {
    id: 'yards_meters',
    name: 'Yards ↔ Meters',
    fromName: 'Yards',
    toName: 'Meters',
    convert: (yards: number) => yards * 0.9144,
    reverseConvert: (meters: number) => meters / 0.9144,
  },
  {
    id: 'miles_km',
    name: 'Miles ↔ Kilometers',
    fromName: 'Miles',
    toName: 'Kilometers',
    convert: (miles: number) => miles * 1.60934,
    reverseConvert: (km: number) => km / 1.60934,
  },
  {
    id: 'nautical_miles_km',
    name: 'Nautical Miles ↔ Kilometers',
    fromName: 'Nautical Miles',
    toName: 'Kilometers',
    convert: (nm: number) => nm * 1.852,
    reverseConvert: (km: number) => km / 1.852,
  },
  {
    id: 'mm_inches',
    name: 'Millimeters ↔ Inches',
    fromName: 'Millimeters',
    toName: 'Inches',
    convert: (mm: number) => mm / 25.4,
    reverseConvert: (inches: number) => inches * 25.4,
  },
];

// Weight / Mass conversions
const weightConversions: ConversionUnit[] = [
  {
    id: 'ounces_grams',
    name: 'Ounces ↔ Grams',
    fromName: 'Ounces',
    toName: 'Grams',
    convert: (oz: number) => oz * 28.3495,
    reverseConvert: (g: number) => g / 28.3495,
  },
  {
    id: 'pounds_kg',
    name: 'Pounds ↔ Kilograms',
    fromName: 'Pounds',
    toName: 'Kilograms',
    convert: (lbs: number) => lbs * 0.453592,
    reverseConvert: (kg: number) => kg / 0.453592,
  },
  {
    id: 'tons_metric_tons',
    name: 'Tons (US) ↔ Metric Tons',
    fromName: 'Tons (US)',
    toName: 'Metric Tons',
    convert: (tons: number) => tons * 0.907185,
    reverseConvert: (mt: number) => mt / 0.907185,
  },
  {
    id: 'grains_grams',
    name: 'Grains ↔ Grams',
    fromName: 'Grains',
    toName: 'Grams',
    convert: (grains: number) => grains * 0.0648,
    reverseConvert: (g: number) => g / 0.0648,
  },
  {
    id: 'stones_pounds',
    name: 'Stones ↔ Pounds',
    fromName: 'Stones',
    toName: 'Pounds',
    convert: (stones: number) => stones * 14,
    reverseConvert: (lbs: number) => lbs / 14,
  },
];

// Volume (Liquid) conversions
const volumeConversions: ConversionUnit[] = [
  {
    id: 'teaspoons_ml',
    name: 'Teaspoons ↔ Milliliters',
    fromName: 'Teaspoons',
    toName: 'Milliliters',
    convert: (tsp: number) => tsp * 4.92892,
    reverseConvert: (ml: number) => ml / 4.92892,
  },
  {
    id: 'tablespoons_ml',
    name: 'Tablespoons ↔ Milliliters',
    fromName: 'Tablespoons',
    toName: 'Milliliters',
    convert: (tbsp: number) => tbsp * 14.7868,
    reverseConvert: (ml: number) => ml / 14.7868,
  },
  {
    id: 'cups_ml',
    name: 'Cups ↔ Milliliters',
    fromName: 'Cups',
    toName: 'Milliliters',
    convert: (cups: number) => cups * 236.588,
    reverseConvert: (ml: number) => ml / 236.588,
  },
  {
    id: 'fluid_ounces_ml',
    name: 'Fluid Ounces ↔ Milliliters',
    fromName: 'Fluid Ounces',
    toName: 'Milliliters',
    convert: (floz: number) => floz * 29.5735,
    reverseConvert: (ml: number) => ml / 29.5735,
  },
  {
    id: 'pints_liters',
    name: 'Pints ↔ Liters',
    fromName: 'Pints',
    toName: 'Liters',
    convert: (pints: number) => pints * 0.473176,
    reverseConvert: (l: number) => l / 0.473176,
  },
  {
    id: 'gallons_liters',
    name: 'Gallons ↔ Liters',
    fromName: 'Gallons',
    toName: 'Liters',
    convert: (gal: number) => gal * 3.78541,
    reverseConvert: (l: number) => l / 3.78541,
  },
  {
    id: 'quarts_liters',
    name: 'Quarts ↔ Liters',
    fromName: 'Quarts',
    toName: 'Liters',
    convert: (qt: number) => qt * 0.946353,
    reverseConvert: (l: number) => l / 0.946353,
  },
];

// Temperature conversions
const temperatureConversions: ConversionUnit[] = [
  {
    id: 'fahrenheit_celsius',
    name: 'Fahrenheit ↔ Celsius',
    fromName: 'Fahrenheit',
    toName: 'Celsius',
    convert: (f: number) => (f - 32) * (5 / 9),
    reverseConvert: (c: number) => c * (9 / 5) + 32,
  },
  {
    id: 'celsius_kelvin',
    name: 'Celsius ↔ Kelvin',
    fromName: 'Celsius',
    toName: 'Kelvin',
    convert: (c: number) => c + 273.15,
    reverseConvert: (k: number) => k - 273.15,
  },
  {
    id: 'fahrenheit_kelvin',
    name: 'Fahrenheit ↔ Kelvin',
    fromName: 'Fahrenheit',
    toName: 'Kelvin',
    convert: (f: number) => ((f - 32) * 5) / 9 + 273.15,
    reverseConvert: (k: number) => ((k - 273.15) * 9) / 5 + 32,
  },
];

// Area conversions
const areaConversions: ConversionUnit[] = [
  {
    id: 'sqft_sqm',
    name: 'Square Feet ↔ Square Meters',
    fromName: 'Square Feet',
    toName: 'Square Meters',
    convert: (sqft: number) => sqft * 0.092903,
    reverseConvert: (sqm: number) => sqm / 0.092903,
  },
  {
    id: 'acres_sqm',
    name: 'Acres ↔ Square Meters',
    fromName: 'Acres',
    toName: 'Square Meters',
    convert: (acres: number) => acres * 4046.86,
    reverseConvert: (sqm: number) => sqm / 4046.86,
  },
  {
    id: 'acres_hectares',
    name: 'Acres ↔ Hectares',
    fromName: 'Acres',
    toName: 'Hectares',
    convert: (acres: number) => acres * 0.404686,
    reverseConvert: (ha: number) => ha / 0.404686,
  },
];

// Speed conversions
const speedConversions: ConversionUnit[] = [
  {
    id: 'mph_kmh',
    name: 'Miles per Hour ↔ Kilometers per Hour',
    fromName: 'MPH',
    toName: 'KM/H',
    convert: (mph: number) => mph * 1.60934,
    reverseConvert: (kmh: number) => kmh / 1.60934,
  },
  {
    id: 'knots_mph',
    name: 'Knots ↔ MPH',
    fromName: 'Knots',
    toName: 'MPH',
    convert: (knots: number) => knots * 1.15078,
    reverseConvert: (mph: number) => mph / 1.15078,
  },
  {
    id: 'knots_kmh',
    name: 'Knots ↔ KM/H',
    fromName: 'Knots',
    toName: 'KM/H',
    convert: (knots: number) => knots * 1.852,
    reverseConvert: (kmh: number) => kmh / 1.852,
  },
  {
    id: 'ms_kmh',
    name: 'Meters per Second ↔ KM/H',
    fromName: 'M/S',
    toName: 'KM/H',
    convert: (ms: number) => ms * 3.6,
    reverseConvert: (kmh: number) => kmh / 3.6,
  },
];

// Pressure conversions
const pressureConversions: ConversionUnit[] = [
  {
    id: 'psi_bar',
    name: 'PSI ↔ Bar',
    fromName: 'PSI',
    toName: 'Bar',
    convert: (psi: number) => psi * 0.0689476,
    reverseConvert: (bar: number) => bar / 0.0689476,
  },
  {
    id: 'psi_kpa',
    name: 'PSI ↔ kPa',
    fromName: 'PSI',
    toName: 'kPa',
    convert: (psi: number) => psi * 6.89476,
    reverseConvert: (kpa: number) => kpa / 6.89476,
  },
  {
    id: 'inhg_hpa',
    name: 'Inches of Mercury ↔ hPa',
    fromName: 'inHg',
    toName: 'hPa',
    convert: (inhg: number) => inhg * 33.8639,
    reverseConvert: (hpa: number) => hpa / 33.8639,
  },
  {
    id: 'atm_kpa',
    name: 'Atmospheres ↔ kPa',
    fromName: 'Atmospheres',
    toName: 'kPa',
    convert: (atm: number) => atm * 101.325,
    reverseConvert: (kpa: number) => kpa / 101.325,
  },
];

// Energy / Power conversions
const energyConversions: ConversionUnit[] = [
  {
    id: 'joules_calories',
    name: 'Joules ↔ Calories',
    fromName: 'Joules',
    toName: 'Calories',
    convert: (j: number) => j * 0.239006,
    reverseConvert: (cal: number) => cal / 0.239006,
  },
  {
    id: 'kwh_wh',
    name: 'Kilowatt-hours ↔ Watt-hours',
    fromName: 'kWh',
    toName: 'Wh',
    convert: (kwh: number) => kwh * 1000,
    reverseConvert: (wh: number) => wh / 1000,
  },
  {
    id: 'btu_joules',
    name: 'BTU ↔ Joules',
    fromName: 'BTU',
    toName: 'Joules',
    convert: (btu: number) => btu * 1055.06,
    reverseConvert: (j: number) => j / 1055.06,
  },
];

// Time conversions
const timeConversions: ConversionUnit[] = [
  {
    id: 'seconds_minutes',
    name: 'Seconds ↔ Minutes',
    fromName: 'Seconds',
    toName: 'Minutes',
    convert: (sec: number) => sec / 60,
    reverseConvert: (min: number) => min * 60,
  },
  {
    id: 'minutes_hours',
    name: 'Minutes ↔ Hours',
    fromName: 'Minutes',
    toName: 'Hours',
    convert: (min: number) => min / 60,
    reverseConvert: (hr: number) => hr * 60,
  },
  {
    id: 'hours_days',
    name: 'Hours ↔ Days',
    fromName: 'Hours',
    toName: 'Days',
    convert: (hr: number) => hr / 24,
    reverseConvert: (days: number) => days * 24,
  },
];

// Compass / Navigation Angles conversions
const angleConversions: ConversionUnit[] = [
  {
    id: 'degrees_mils',
    name: 'Degrees ↔ Mils',
    fromName: 'Degrees',
    toName: 'Mils',
    convert: (deg: number) => deg * 17.7778,
    reverseConvert: (mils: number) => mils / 17.7778,
  },
  {
    id: 'radians_degrees',
    name: 'Radians ↔ Degrees',
    fromName: 'Radians',
    toName: 'Degrees',
    convert: (rad: number) => rad * (180 / Math.PI),
    reverseConvert: (deg: number) => deg * (Math.PI / 180),
  },
];

// Fuel & Efficiency conversions
const fuelConversions: ConversionUnit[] = [
  {
    id: 'mpg_lp100km',
    name: 'MPG ↔ L/100km',
    fromName: 'MPG',
    toName: 'L/100km',
    convert: (mpg: number) => (mpg === 0 ? NaN : 235.215 / mpg),
    reverseConvert: (lp100km: number) =>
      lp100km === 0 ? NaN : 235.215 / lp100km,
  },
  {
    id: 'gallons_liters_fuel',
    name: 'Gallons ↔ Liters',
    fromName: 'Gallons',
    toName: 'Liters',
    convert: (gal: number) => gal * 3.78541,
    reverseConvert: (l: number) => l / 3.78541,
  },
];

// Light conversion constants
// Approximate lumens per watt for incandescent bulbs (typically 12-18 lumens/watt)
const LUMENS_PER_WATT_INCANDESCENT = 15;

// Light conversions
const lightConversions: ConversionUnit[] = [
  {
    id: 'lux_footcandles',
    name: 'Lux ↔ Foot-candles',
    fromName: 'Lux',
    toName: 'Foot-candles',
    convert: (lux: number) => lux * 0.092903,
    reverseConvert: (fc: number) => fc / 0.092903,
  },
  {
    id: 'lumens_watts',
    name: 'Lumens ↔ Watts (incandescent)',
    fromName: 'Lumens',
    toName: 'Watts',
    // Note: This approximation is for traditional incandescent bulbs only.
    // LED bulbs have much higher efficiency (80-100 lumens/watt).
    convert: (lm: number) => lm / LUMENS_PER_WATT_INCANDESCENT,
    reverseConvert: (w: number) => w * LUMENS_PER_WATT_INCANDESCENT,
  },
];

export const conversionCategories: ConversionCategory[] = [
  {
    id: 'length',
    name: 'Length / Distance',
    icon: 'resize-outline',
    units: lengthConversions,
  },
  {
    id: 'weight',
    name: 'Weight / Mass',
    icon: 'barbell-outline',
    units: weightConversions,
  },
  {
    id: 'volume',
    name: 'Volume (Liquid)',
    icon: 'water-outline',
    units: volumeConversions,
  },
  {
    id: 'temperature',
    name: 'Temperature',
    icon: 'thermometer-outline',
    units: temperatureConversions,
  },
  {
    id: 'area',
    name: 'Area',
    icon: 'square-outline',
    units: areaConversions,
  },
  {
    id: 'speed',
    name: 'Speed',
    icon: 'speedometer-outline',
    units: speedConversions,
  },
  {
    id: 'pressure',
    name: 'Pressure',
    icon: 'fitness-outline',
    units: pressureConversions,
  },
  {
    id: 'energy',
    name: 'Energy / Power',
    icon: 'flash-outline',
    units: energyConversions,
  },
  {
    id: 'time',
    name: 'Time',
    icon: 'time-outline',
    units: timeConversions,
  },
  {
    id: 'angles',
    name: 'Compass / Angles',
    icon: 'compass-outline',
    units: angleConversions,
  },
  {
    id: 'fuel',
    name: 'Fuel & Efficiency',
    icon: 'car-outline',
    units: fuelConversions,
  },
  {
    id: 'light',
    name: 'Light',
    icon: 'sunny-outline',
    units: lightConversions,
  },
];

/**
 * Converts a Celsius temperature value to a display string in the preferred unit.
 * @param celsius - Temperature in Celsius
 * @param system - 'imperial' for Fahrenheit or 'metric' for Celsius
 * @returns Formatted temperature string, e.g. "72°F" or "22°C"
 */
export function displayTemp(
  celsius: number,
  system: MeasurementSystem,
): string {
  if (system === 'imperial') {
    return `${Math.round(celsius * (9 / 5) + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/**
 * Converts a pressure value in hPa to a display string in the preferred unit.
 * @param hPa - Pressure in hectopascals
 * @param system - 'imperial' for inHg or 'metric' for hPa
 * @returns Formatted pressure string, e.g. "29.92 inHg" or "1013 hPa"
 */
export function displayPressure(
  hPa: number,
  system: MeasurementSystem,
): string {
  if (system === 'imperial') return `${hpaToInhg(hPa).toFixed(2)} inHg`;
  return `${Math.round(hPa)} hPa`;
}

/**
 * Converts a speed value in km/h to a display string in the preferred unit.
 * @param kmh - Speed in kilometers per hour
 * @param system - 'imperial' for mph or 'metric' for km/h
 * @returns Formatted speed string, e.g. "62 mph" or "100 km/h"
 */
export function displaySpeed(kmh: number, system: MeasurementSystem): string {
  if (system === 'imperial') return `${Math.round(kmh * 0.62137)} mph`;
  return `${Math.round(kmh)} km/h`;
}

/**
 * Converts a precipitation value in mm to a display string in the preferred unit.
 * @param mm - Precipitation in millimeters
 * @param system - 'imperial' for inches or 'metric' for mm
 * @returns Formatted precipitation string, e.g. "0.39 in" or "10 mm"
 */
export function displayPrecipitation(
  mm: number,
  system: MeasurementSystem,
): string {
  if (system === 'imperial') return `${(mm * 0.03937).toFixed(2)} in`;
  return `${Math.round(mm)} mm`;
}
