/** NATO/ICAO spelling alphabet code words, A–Z. */
export const natoPhoneticAlphabet = [
  { letter: 'A', code: 'Alpha' },
  { letter: 'B', code: 'Bravo' },
  { letter: 'C', code: 'Charlie' },
  { letter: 'D', code: 'Delta' },
  { letter: 'E', code: 'Echo' },
  { letter: 'F', code: 'Foxtrot' },
  { letter: 'G', code: 'Golf' },
  { letter: 'H', code: 'Hotel' },
  { letter: 'I', code: 'India' },
  { letter: 'J', code: 'Juliet' },
  { letter: 'K', code: 'Kilo' },
  { letter: 'L', code: 'Lima' },
  { letter: 'M', code: 'Mike' },
  { letter: 'N', code: 'November' },
  { letter: 'O', code: 'Oscar' },
  { letter: 'P', code: 'Papa' },
  { letter: 'Q', code: 'Quebec' },
  { letter: 'R', code: 'Romeo' },
  { letter: 'S', code: 'Sierra' },
  { letter: 'T', code: 'Tango' },
  { letter: 'U', code: 'Uniform' },
  { letter: 'V', code: 'Victor' },
  { letter: 'W', code: 'Whiskey' },
  { letter: 'X', code: 'X-ray' },
  { letter: 'Y', code: 'Yankee' },
  { letter: 'Z', code: 'Zulu' },
];

/**
 * ICAO/NATO radiotelephony numerals. Digits are spoken one at a time, and
 * four are deliberately altered so they survive a clipped, noisy channel:
 * 3 "tree", 4 "fower", 5 "fife" and 9 "niner".
 */
export const natoPhoneticNumerals = [
  { digit: '0', code: 'Zero' },
  { digit: '1', code: 'One' },
  { digit: '2', code: 'Two' },
  { digit: '3', code: 'Tree' },
  { digit: '4', code: 'Fower' },
  { digit: '5', code: 'Fife' },
  { digit: '6', code: 'Six' },
  { digit: '7', code: 'Seven' },
  { digit: '8', code: 'Eight' },
  { digit: '9', code: 'Niner' },
];
