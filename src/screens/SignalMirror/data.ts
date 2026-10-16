/**
 * Ground-to-air signals: symbols survivors lay out on the ground for search
 * aircraft.
 *
 * There are two codes, and they disagree, so each signal says which it's
 * from:
 *
 * - `icao`: the current international standard, ICAO Annex 12 (Search and
 *   Rescue), Appendix, 2.1 "Ground-air visual signal code for use by
 *   survivors". Five symbols. Checked against national AIPs that reproduce
 *   it (Albania AIP GEN 3.6, Airservices Australia AIP SUP H102/26).
 * - `older`: the larger emergency code from WWII-era Air Ministry and later
 *   FAA / US Forest Service cards (FAA "Visual Emergency Signals", GPO 1985),
 *   still printed on many survival cards. Pilots trained only on
 *   the ICAO code may not know it, so the screen lists it second. In this
 *   code X meant "unable to proceed"; today X means medical help.
 *
 * Meanings follow those sources' wording. Don't add or soften a meaning
 * (e.g. "probably" in "Probably safe to land here" is load-bearing).
 */
export type SignalCode = 'icao' | 'older';

export interface GroundSignal {
  symbol: string;
  meaning: string;
  code: SignalCode;
  minSize: string;
  materials: string;
}

/**
 * ICAO Annex 12 asks for symbols "at least 2.5 metres (8 feet) long".
 * Bigger is easier to spot from altitude, so the screen says so too.
 */
export const GROUND_SIGNAL_MIN_SIZE = '2.5 m (8 ft) long; bigger if you can';

/**
 * How a pilot acknowledges a ground signal (ICAO Annex 12, Appendix, 3).
 */
export const AIR_ACKNOWLEDGEMENT =
  'A pilot who has understood your signal rocks the wings by day, or ' +
  'flashes the landing or navigation lights on and off twice at night. No ' +
  'response means the signal was not understood.';

export const GROUND_TO_AIR_SIGNALS: GroundSignal[] = [
  // ICAO Annex 12, in the Annex's order.
  {
    symbol: 'V',
    meaning: 'Require assistance',
    code: 'icao',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials:
      'Rocks, logs, torn clothing, trampled vegetation, any contrast material',
  },
  {
    symbol: 'X',
    meaning: 'Require medical assistance',
    code: 'icao',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, brightly colored fabric, snow trench',
  },
  {
    symbol: 'N',
    meaning: 'No or negative',
    code: 'icao',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, clothing, any high-contrast material',
  },
  {
    symbol: 'Y',
    meaning: 'Yes or affirmative',
    code: 'icao',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, clothing, any high-contrast material',
  },
  {
    symbol: '→',
    meaning: 'Proceeding in this direction',
    code: 'icao',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials:
      'Rocks, branches, clothing; point arrow toward direction of travel',
  },
  // The older emergency code.
  {
    symbol: 'F',
    meaning: 'Require food and water',
    code: 'older',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, sand furrows, trampled grass',
  },
  {
    symbol: 'K',
    meaning: 'Indicate direction to proceed',
    code: 'older',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, branches, clothing',
  },
  {
    symbol: '△',
    meaning: 'Probably safe to land here',
    code: 'older',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, fabric; place in open flat area free of obstacles',
  },
  {
    symbol: 'LL',
    meaning: 'All well',
    code: 'older',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, clothing, any high-contrast material',
  },
  {
    symbol: 'JL',
    meaning: 'Not understood',
    code: 'older',
    minSize: GROUND_SIGNAL_MIN_SIZE,
    materials: 'Rocks, logs, any available material',
  },
];

export const ICAO_GROUND_SIGNALS = GROUND_TO_AIR_SIGNALS.filter(
  (s) => s.code === 'icao',
);
export const OLDER_GROUND_SIGNALS = GROUND_TO_AIR_SIGNALS.filter(
  (s) => s.code === 'older',
);
