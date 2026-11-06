import health from '../../data/health.json';
import roadside from '../../data/roadside.json';
import weather from '../../data/weather.json';
import ReferenceEntryType from '../../types/data-type';

/**
 * Advice for keeping a phone working in the cold.
 *
 * The facts behind it: Apple rates iPhones for use between 0 and 35 °C
 * (32–95 °F) and says that below that the battery can drain early or the phone
 * can switch off, with battery life returning once it warms up. Lithium-ion
 * cells must not be charged below freezing: the charge can plate lithium onto
 * the anode, which is permanent. Capacity roughly halves around −18 °C (0 °F)
 * and comes back when the cell warms.
 */
export const KEEP_PHONE_WARM: string[] = [
  'Carry it in an inside pocket, against your body. Your body heat is the best warmer it has.',
  'Below freezing (0 °C / 32 °F) the battery drains fast and the phone can switch off with charge still showing. That charge comes back once it warms up.',
  'Warm it slowly with body heat. Not on a stove, fire or heater.',
  "Don't charge a phone or power bank that is below freezing; warm it first. Charging a frozen battery damages it for good.",
  'Coming into a warm shelter, leave it sealed in a pocket or bag for a while so moisture does not condense inside.',
  'Take it out for the task, then put it straight back.',
];

/** Things that cut the drain. Airplane Mode leaves GPS working. */
export const MAKE_BATTERY_LAST: string[] = [
  'Turn on Low Power Mode (iPhone) or Battery Saver (Android).',
  'With no signal, switch on Airplane Mode. Searching for a network drains the battery fast, and GPS keeps working without it.',
  'Turn the screen brightness down and keep the flashlight off when you can.',
  'Keep a power bank in a warm pocket too, so it is ready when the phone needs it.',
];

/** Reference entries for staying warm, in reading order. */
export const STAYING_WARM_ENTRY_IDS = [
  'illness_hypothermia',
  'cold_weather_hypothermia_prevention',
  'cold_weather_frostbite',
  'season_winter_survival_basics',
  'snow_ice_snow_shelter',
  'roadside_winter_stranded',
] as const;

const ALL_ENTRIES = [
  ...health.entries,
  ...weather.entries,
  ...roadside.entries,
] as ReferenceEntryType[];

/** The staying-warm entries, skipping any id the data no longer has. */
export function stayingWarmEntries(): ReferenceEntryType[] {
  return STAYING_WARM_ENTRY_IDS.map((id) =>
    ALL_ENTRIES.find((entry) => entry.id === id),
  ).filter((entry): entry is ReferenceEntryType => entry !== undefined);
}
