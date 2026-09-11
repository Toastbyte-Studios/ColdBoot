import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { FOOTER_HEIGHT } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { onColor } from '../../theme/colorUtils';
import { morseToText } from '../../utils/morseCodeMapping';

/**
 * Morse to Alpha screen allows users to input morse code and see real-time translation.
 *
 * Features:
 * - Buttons for dot, dash, space (character separator), word separator (/), backspace, and clear
 * - Real-time translation as user types
 * - No submit button - translation happens automatically
 * - Shows both morse code input and translated text output
 */
const MorseToAlphaScreen = () => {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [morseInput, setMorseInput] = useState('');

  // Compute translation directly from morse input
  const translatedText = morseToText(morseInput);

  const handleDot = () => {
    setMorseInput((prev) => prev + '.');
  };

  const handleDash = () => {
    setMorseInput((prev) => prev + '-');
  };

  const handleSpace = () => {
    // Add space between morse characters
    if (morseInput.length > 0 && morseInput[morseInput.length - 1] !== ' ') {
      setMorseInput((prev) => prev + ' ');
    }
  };

  const handleWordSeparator = () => {
    // Add word separator (/) with spaces around it
    // Prevent adding consecutive word separators
    if (morseInput.length > 0) {
      const trimmed = morseInput.trimEnd();
      // Check if the last non-space character is already a word separator
      if (trimmed.length > 0 && trimmed[trimmed.length - 1] !== '/') {
        const lastChar = morseInput[morseInput.length - 1];
        if (lastChar === ' ') {
          setMorseInput((prev) => prev + '/ ');
        } else {
          setMorseInput((prev) => prev + ' / ');
        }
      }
    }
  };

  const handleBackspace = () => {
    setMorseInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setMorseInput('');
  };

  return (
    <ScreenBody>
      <SectionHeader>Morse to Alpha</SectionHeader>

      <View style={styles.container}>
        {/* Morse Code Input Display */}
        <View style={styles.displayContainer}>
          <Text style={styles.displayLabel}>Morse Code:</Text>
          <View style={styles.displayBox}>
            <Text style={styles.displayText}>
              {morseInput || 'Enter morse code...'}
            </Text>
          </View>
        </View>

        {/* Translated Text Display */}
        <View style={styles.displayContainer}>
          <Text style={styles.displayLabel}>Translation:</Text>
          <View style={styles.displayBox}>
            <Text style={styles.translatedText}>{translatedText || '-'}</Text>
          </View>
        </View>

        {/* Input keypad.
            The glyphs on these keys are deliberately left as text rather than
            converted to Ionicons: the keypad is a legend of literal morse
            characters (. - /), and the space and backspace symbols belong to
            that same typographic set. Swapping only two of the six for icons
            would break the set. See docs/NATIVE_REDESIGN.md finding 7. */}
        <View style={styles.buttonGrid}>
          <View style={styles.buttonRow}>
            <Touchable
              style={[styles.button, styles.primaryButton]}
              rippleColor={onColor(COLORS.ACCENT)}
              onPress={handleDot}
              accessibilityLabel="Add dot"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>.</Text>
              <Text style={[styles.buttonLabel, styles.onPrimary]}>DOT</Text>
            </Touchable>

            <Touchable
              style={[styles.button, styles.primaryButton]}
              rippleColor={onColor(COLORS.ACCENT)}
              onPress={handleDash}
              accessibilityLabel="Add dash"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>-</Text>
              <Text style={[styles.buttonLabel, styles.onPrimary]}>DASH</Text>
            </Touchable>

            <Touchable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSpace}
              accessibilityLabel="Add space between characters"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>␣</Text>
              <Text style={styles.buttonLabel}>SPACE</Text>
            </Touchable>
          </View>

          <View style={styles.buttonRow}>
            <Touchable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleWordSeparator}
              accessibilityLabel="Add word separator"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>/</Text>
              <Text style={styles.buttonLabel}>WORD</Text>
            </Touchable>

            <Touchable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleBackspace}
              accessibilityLabel="Delete last character"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>⌫</Text>
              <Text style={styles.buttonLabel}>BACK</Text>
            </Touchable>

            <Touchable
              style={[styles.button, styles.clearButton]}
              rippleColor={onColor(COLORS.BRAND)}
              onPress={handleClear}
              accessibilityLabel="Clear all input"
              accessibilityRole="button"
            >
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </Touchable>
          </View>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Tip: Press SPACE between morse characters (letters/numbers) and WORD
            to separate words.
          </Text>
        </View>
      </View>
    </ScreenBody>
  );
};

export default MorseToAlphaScreen;

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: FOOTER_HEIGHT + 10,
    },
    displayContainer: {
      width: '100%',
      marginBottom: 10,
    },
    displayLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 5,
    },
    displayBox: {
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderWidth: 2,
      borderColor: COLORS.BRAND,
      borderRadius: 8,
      padding: 10,
      minHeight: 50,
      justifyContent: 'center',
    },
    displayText: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      fontFamily: 'monospace',
    },
    translatedText: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.ACCENT,
    },
    buttonGrid: {
      width: '100%',
      marginTop: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    button: {
      flex: 1,
      minHeight: 48,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: COLORS.ACCENT,
      borderWidth: 2,
      borderColor: COLORS.BRAND,
    },
    primaryButtonText: {
      fontSize: 24,
      fontWeight: '700',
      color: onColor(COLORS.ACCENT),
    },
    onPrimary: {
      color: onColor(COLORS.ACCENT),
    },
    secondaryButton: {
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderWidth: 2,
      borderColor: COLORS.BRAND,
    },
    secondaryButtonText: {
      fontSize: 20,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
    },
    buttonLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
      marginTop: 2,
    },
    clearButton: {
      backgroundColor: COLORS.BRAND,
    },
    clearButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: onColor(COLORS.BRAND),
    },
    helpContainer: {
      marginTop: 10,
      padding: 8,
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.SECONDARY_ACCENT,
    },
    helpText: {
      fontSize: 11,
      color: COLORS.SECONDARY_ACCENT,
      textAlign: 'center',
    },
  });
