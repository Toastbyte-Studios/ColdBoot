import React, { useState } from 'react';
import IconButton from '../../components/IconButton';
import ReferenceTable from '../../components/ReferenceTable';
import StackScreen from '../../components/StackScreen';
import { morseCodeData, MorseItem } from '../../utils/morseCodeMapping';

type SortType = 'alphabetical' | 'morse';

/**
 * Displays the Morse Code Cheat Sheet with all letters (A-Z) and numbers (0-9).
 *
 * Each character is shown with its corresponding Morse code pattern.
 * Users can toggle between alphabetical sorting (A-Z, then 0-9) and Morse pattern sorting (shortest to longest).
 * The content is scrollable to accommodate all entries and ensure visibility past the footer.
 *
 * @returns A React element containing the Morse Code Cheat Sheet screen.
 */
export default function MorseCodeCheatSheet() {
  const [sortType, setSortType] = useState<SortType>('alphabetical');

  const getSortedData = (): MorseItem[] => {
    if (sortType === 'alphabetical') {
      // Already sorted alphabetically in the data array (A-Z, then 0-9)
      return morseCodeData;
    } else {
      // Sort by morse code pattern length (shortest to longest), then alphabetically for same length
      return [...morseCodeData].sort((a, b) => {
        const lengthDiff = a.morse.length - b.morse.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.char.localeCompare(b.char);
      });
    }
  };

  const toggleSort = () => {
    setSortType(sortType === 'alphabetical' ? 'morse' : 'alphabetical');
  };

  const sortedData = getSortedData();

  const isAlphabetical = sortType === 'alphabetical';

  return (
    <StackScreen
      title="Morse Cheat Sheet"
      subtitle={isAlphabetical ? 'A–Z, then 0–9' : 'Shortest pattern first'}
      trailing={
        <IconButton
          name="swap-vertical-outline"
          size={22}
          accessibilityLabel={`Sorted ${
            isAlphabetical ? 'alphabetically' : 'by pattern'
          }. Tap to change.`}
          onPress={toggleSort}
        />
      }
    >
      <ReferenceTable
        monospaceColumn={0}
        rows={sortedData.map((item) => ({
          key: item.char,
          values: [item.morse, item.spellOut],
        }))}
      />
    </StackScreen>
  );
}
