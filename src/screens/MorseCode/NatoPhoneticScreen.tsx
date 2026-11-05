import React from 'react';
import ReferenceTable from '../../components/ReferenceTable';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { natoPhoneticAlphabet, natoPhoneticNumerals } from './natoPhonetic';

/**
 * Displays the NATO Phonetic Alphabet: the 26 letter code words (A - Alfa,
 * B - Bravo, and so on), then the 10 radio numerals (3 - Tree, 9 - Niner), as
 * two lookup tables.
 *
 * @returns A React element containing the NATO Phonetic Alphabet screen.
 */
export default function NatoPhoneticScreen() {
  return (
    <StackScreen title="NATO Phonetic">
      <SectionEyebrow>Letters</SectionEyebrow>
      <ReferenceTable
        rows={natoPhoneticAlphabet.map((item) => ({
          key: item.letter,
          values: [item.code],
        }))}
      />

      <SectionEyebrow>Numerals</SectionEyebrow>
      <ReferenceTable
        rows={natoPhoneticNumerals.map((item) => ({
          key: item.digit,
          values: [item.code],
        }))}
      />
    </StackScreen>
  );
}
