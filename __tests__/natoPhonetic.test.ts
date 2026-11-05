import {
  natoPhoneticAlphabet,
  natoPhoneticNumerals,
} from '../src/screens/MorseCode/natoPhonetic';

describe('natoPhoneticNumerals', () => {
  it('covers 0-9 with the ICAO radio pronunciations', () => {
    expect(
      Object.fromEntries(natoPhoneticNumerals.map((n) => [n.digit, n.code])),
    ).toEqual({
      '0': 'Zero',
      '1': 'One',
      '2': 'Two',
      '3': 'Tree',
      '4': 'Fower',
      '5': 'Fife',
      '6': 'Six',
      '7': 'Seven',
      '8': 'Eight',
      '9': 'Niner',
    });
  });
});

describe('natoPhoneticAlphabet', () => {
  it('uses the official ICAO spellings for A and J', () => {
    const codeFor = (letter: string) =>
      natoPhoneticAlphabet.find((item) => item.letter === letter)?.code;

    expect(codeFor('A')).toBe('Alfa');
    expect(codeFor('J')).toBe('Juliett');
  });
});
