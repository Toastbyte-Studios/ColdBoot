export const weatherOutlookSeasonalResponseFixture = {
  latitude: 36.17,
  longitude: -115.14,
  timezone: 'GMT',
  timezone_abbreviation: 'GMT',
  monthly_units: {
    time: 'iso8601',
    temperature_2m_mean: '°C',
    precipitation_mean: 'mm',
    snowfall_mean: 'cm',
    wind_speed_10m_mean: 'km/h',
    shortwave_radiation_mean: 'MJ/m²',
  },
  monthly: {
    time: ['2026-10-01', '2026-11-01'],
    temperature_2m_mean: [19.2, 12.4],
    precipitation_mean: [14.6, 22.1],
    snowfall_mean: [0, 1.8],
    wind_speed_10m_mean: [24.9, 31.4],
    shortwave_radiation_mean: [512.3, 381.7],
  },
} as const;
