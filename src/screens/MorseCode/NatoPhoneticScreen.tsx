import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ReferenceTable from '../../components/ReferenceTable';
import SegmentedControl, {
  SegmentedOption,
} from '../../components/SegmentedControl';
import StackScreen from '../../components/StackScreen';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { natoPhoneticAlphabet, natoPhoneticNumerals } from './natoPhonetic';

const isAndroid = Platform.OS === 'android';

type NatoTable = 'letters' | 'numerals';

const TABLE_OPTIONS: readonly SegmentedOption<NatoTable>[] = [
  { value: 'letters', label: 'Letters' },
  { value: 'numerals', label: 'Numerals' },
];

const LETTER_ROWS = natoPhoneticAlphabet.map((item) => ({
  key: item.letter,
  values: [item.code],
}));

const NUMERAL_ROWS = natoPhoneticNumerals.map((item) => ({
  key: item.digit,
  values: [item.code],
}));

/**
 * Displays the NATO Phonetic Alphabet as one lookup table at a time: the 26
 * letter code words (A - Alfa, B - Bravo, and so on) or the 10 radio numerals
 * (3 - Tree, 9 - Niner), switched with a segmented control. Letters show
 * first, since they're what people come here for.
 *
 * The control names the table below it, so there's no section label as well.
 *
 * @returns A React element containing the NATO Phonetic Alphabet screen.
 */
export default function NatoPhoneticScreen() {
  const [table, setTable] = useState<NatoTable>('letters');

  return (
    <StackScreen title="NATO Phonetic">
      <View style={styles.control}>
        <SegmentedControl
          options={TABLE_OPTIONS}
          value={table}
          onChange={setTable}
          accessibilityLabel="Code words for"
          testID="nato-table-toggle"
        />
      </View>
      <ReferenceTable rows={table === 'letters' ? LETTER_ROWS : NUMERAL_ROWS} />
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  control: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.lg,
  },
});
