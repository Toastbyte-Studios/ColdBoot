import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { FOOTER_HEIGHT } from '../../theme';
import { ColorScheme } from '../../theme/colors';
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
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
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

  return (
    <ScreenBody>
      <SectionHeader>Morse Code Cheat Sheet</SectionHeader>
      <View style={[styles.container, { paddingBottom: footerClearance }]}>
        <View style={styles.sortButton}>
          <AppButton
            label={`Sort: ${sortType === 'alphabetical' ? 'Alphabetical' : 'By Pattern'}`}
            tint={COLORS.BRAND}
            fullWidth
            onPress={toggleSort}
            accessibilityLabel={`Sorted ${sortType === 'alphabetical' ? 'alphabetically' : 'by pattern'}. Tap to change.`}
          />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {sortedData.map((item) => (
            <View key={item.char} style={styles.card}>
              <Text style={styles.char}>{item.char}</Text>
              <Ionicons
                name="arrow-forward-outline"
                size={18}
                color={COLORS.PRIMARY_DARK}
                style={styles.separator}
              />
              <Text style={styles.morse}>{item.morse}</Text>
              <Ionicons
                name="arrow-forward-outline"
                size={18}
                color={COLORS.PRIMARY_DARK}
                style={styles.separator}
              />
              <Text style={styles.spellOut}>{item.spellOut}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenBody>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      paddingBottom: FOOTER_HEIGHT,
    },
    sortButton: {
      marginHorizontal: 14,
      marginTop: 8,
      marginBottom: 8,
    },
    scrollView: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingTop: 8,
      paddingHorizontal: 14,
      paddingBottom: 24,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.BRAND,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      backgroundColor: COLORS.PRIMARY_LIGHT,
    },
    char: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.PRIMARY_DARK,
      width: 40,
    },
    separator: {
      marginHorizontal: 5,
    },
    morse: {
      fontSize: 30,
      fontFamily: 'monospace',
      color: COLORS.PRIMARY_DARK,
      marginHorizontal: 5,
      minWidth: 60,
    },
    spellOut: {
      fontSize: 18,
      color: COLORS.PRIMARY_DARK,
      flex: 1,
    },
  });
