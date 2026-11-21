import { MORSE_CODE_MAP } from '../../utils/morseCodeMapping';

/**
 * The order the hero works through the characters, one a day.
 *
 * It is the Koch method's teaching order (letters and digits only), which
 * starts with characters that sound unlike each other and leaves the
 * look-alikes for later. Following it day by day is a gentle course; picking
 * at random would serve up H and 5 in the first week.
 */
export const KOCH_ORDER = [
  'K',
  'M',
  'U',
  'R',
  'E',
  'S',
  'N',
  'A',
  'P',
  'T',
  'L',
  'W',
  'I',
  'J',
  'Z',
  'F',
  'O',
  'Y',
  'V',
  'G',
  '5',
  'Q',
  '9',
  '2',
  'H',
  '3',
  '8',
  'B',
  '4',
  '7',
  'C',
  '1',
  'D',
  '6',
  '0',
  'X',
] as const;

const DAY_MS = 86_400_000;

/** Whole local calendar days since 1 January 1970. */
function localDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

export type CharacterOfTheDay = {
  char: string;
  /** Dots and dashes, e.g. "-.-". */
  morse: string;
  /** How it sounds, e.g. "dah-di-dah". */
  sound: string;
};

/**
 * Today's character, in the user's local calendar, so it changes at their
 * midnight rather than at UTC's.
 */
export function characterOfTheDay(date: Date): CharacterOfTheDay {
  const count = KOCH_ORDER.length;
  const index = ((localDayNumber(date) % count) + count) % count;
  const char = KOCH_ORDER[index];
  const morse = MORSE_CODE_MAP[char];
  return { char, morse, sound: morseSound(morse) };
}

/**
 * A pattern as it is said aloud: "dah" for a dash, "di" for a dot, "dit" for
 * a dot at the end. Operators learn characters as sounds, not as counts of
 * dots, so the hero teaches the sound.
 */
export function morseSound(morse: string): string {
  const symbols = morse.split('').filter((s) => s === '.' || s === '-');
  return symbols
    .map((symbol, index) => {
      if (symbol === '-') return 'dah';
      return index === symbols.length - 1 ? 'dit' : 'di';
    })
    .join('-');
}

/** A pattern for a screen reader, e.g. "dash dot dash". */
export function morseSpoken(morse: string): string {
  return morse
    .split('')
    .filter((s) => s === '.' || s === '-')
    .map((s) => (s === '-' ? 'dash' : 'dot'))
    .join(' ');
}
