import React from 'react';
import ReferenceTable from '../../components/ReferenceTable';
import StackScreen from '../../components/StackScreen';

const natoPhoneticAlphabet = [
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
 * Displays the NATO Phonetic Alphabet with all 26 letters and their
 * corresponding code words (A - Alpha, B - Bravo, and so on), as one lookup
 * table.
 *
 * @returns A React element containing the NATO Phonetic Alphabet screen.
 */
export default function NatoPhoneticScreen() {
  return (
    <StackScreen title="NATO Phonetic" subtitle="26 letters">
      <ReferenceTable
        rows={natoPhoneticAlphabet.map((item) => ({
          key: item.letter,
          values: [item.code],
        }))}
      />
    </StackScreen>
  );
}
