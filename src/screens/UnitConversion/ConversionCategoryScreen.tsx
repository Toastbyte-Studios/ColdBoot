import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import { Platform, StyleSheet, View, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import StackScreen from '../../components/StackScreen';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { useGestureNavigation } from '../../navigation/NavigationHistoryContext';
import { RADIUS, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  conversionCategories,
  ConversionUnit,
} from '../../utils/unitConversions';

const isAndroid = Platform.OS === 'android';

type RouteParams = {
  ConversionCategory: {
    categoryId: string;
  };
};

// Formatting constants
const MIN_VALUE_FOR_EXPONENTIAL = 0.0001;
const EXPONENTIAL_SIGNIFICANT_DIGITS = 4;
const DECIMAL_PLACES = 6;

/**
 * ConversionCategoryScreen displays unit conversions for a specific category.
 *
 * Features:
 * - Dropdown to select conversion type within the category
 * - Two-way conversion display
 * - Large numeric keypad for easy input with gloves
 * - Real-time conversion as user types
 *
 * This is the one screen below a module that does not use `StackScreen`. The
 * keypad fills whatever height is left and must not scroll — a glove-sized
 * key that slides under the thumb is worse than no key — so the screen keeps
 * its own fixed layout and takes only the headline row from the redesign. It
 * is presented as a modal, so that row's control is a close button rather
 * than a back chevron: the gesture that dismisses it is a downward swipe, and
 * there is no screen behind it to go back to. The not-found state has no
 * keypad, so that one is an ordinary `StackScreen`.
 *
 * @returns A React element rendering the conversion interface.
 */
export default function ConversionCategoryScreen() {
  const route = useRoute<RouteProp<RouteParams, 'ConversionCategory'>>();
  const navigation = useNavigation();
  const { setDisableGestureNavigation } = useGestureNavigation();
  const COLORS = useTheme();
  const { categoryId } = route.params;

  const category = conversionCategories.find((cat) => cat.id === categoryId);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [inputValue, setInputValue] = useState('0');
  const [isReversed, setIsReversed] = useState(false);

  // Disable gesture navigation when this screen is focused
  useFocusEffect(
    useCallback(() => {
      setDisableGestureNavigation(true);
      return () => setDisableGestureNavigation(false);
    }, [setDisableGestureNavigation]),
  );

  if (!category) {
    return (
      <StackScreen title="Category not found">
        <Text
          style={[
            styles.errorText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          This conversion category is not in the offline table.
        </Text>
      </StackScreen>
    );
  }

  const selectedUnit: ConversionUnit = category.units[selectedUnitIndex];

  const handleNumberPress = (num: string) => {
    setInputValue((prev) => {
      // Handle leading zero - replace '0' with the number, but not '0.' or '-0'
      if (prev === '0' || prev === '-0') {
        return prev.startsWith('-') ? '-' + num : num;
      }
      return prev + num;
    });
  };

  const handleDecimalPress = () => {
    if (!inputValue.includes('.')) {
      setInputValue((prev) => prev + '.');
    }
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const handleBackspace = () => {
    setInputValue((prev) => {
      if (prev.length === 1 || (prev.length === 2 && prev.startsWith('-'))) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  };

  const handleToggleSign = () => {
    setInputValue((prev) => {
      if (prev === '0') {
        return '0';
      }
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  };

  const handleSwap = () => {
    setIsReversed((prev) => !prev);
  };

  const getConvertedValue = (): string => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      return '0';
    }

    const result = isReversed
      ? selectedUnit.reverseConvert(numValue)
      : selectedUnit.convert(numValue);

    // Handle invalid results (Infinity, NaN)
    if (!isFinite(result)) {
      return 'Invalid';
    }

    // Format to significant digits, use exponential notation for very small numbers
    if (Math.abs(result) < MIN_VALUE_FOR_EXPONENTIAL && result !== 0) {
      return result.toExponential(EXPONENTIAL_SIGNIFICANT_DIGITS);
    }
    return result.toFixed(DECIMAL_PLACES).replace(/\.?0+$/, '');
  };

  const fromUnit = isReversed ? selectedUnit.toName : selectedUnit.fromName;
  const toUnit = isReversed ? selectedUnit.fromName : selectedUnit.toName;

  // Helper functions for inline styles
  const getValueContainerStyle = () => [
    styles.valueContainer,
    cardSurface(COLORS),
  ];

  const getKeypadButtonStyle = () => [
    styles.keypadButton,
    {
      backgroundColor: isAndroid ? COLORS.SECONDARY_CONTAINER : COLORS.SURFACE,
      borderColor: COLORS.BORDER,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: COLORS.BACKGROUND }]}>
      <LinearGradient
        colors={COLORS.BACKGROUND_GRADIENT}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <ScreenBody>
        <SectionHeader
          containerStyle={styles.headline}
          title={category.name}
          subtitle="Offline conversion"
          trailing={
            <IconButton
              name="close-outline"
              size={24}
              accessibilityLabel="Close"
              onPress={() => navigation.goBack()}
            />
          }
        />

        {/* Unit Selection */}
        <View style={styles.unitSelectorContainer}>
          <ScrollView horizontal style={styles.unitSelector}>
            {category.units.map((unit, index) => (
              <Touchable
                key={unit.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedUnitIndex === index }}
                style={[
                  styles.unitButton,
                  {
                    backgroundColor:
                      selectedUnitIndex === index
                        ? COLORS.ACCENT_CONTAINER
                        : isAndroid
                          ? COLORS.SURFACE_CONTAINER
                          : COLORS.SURFACE,
                    borderColor: COLORS.BORDER,
                  },
                ]}
                onPress={() => {
                  setSelectedUnitIndex(index);
                  setInputValue('0');
                  setIsReversed(false);
                }}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    {
                      color:
                        selectedUnitIndex === index
                          ? COLORS.ON_ACCENT_CONTAINER
                          : COLORS.PRIMARY_DARK,
                    },
                  ]}
                >
                  {unit.name}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
        </View>

        {/* Conversion Display */}
        <View style={styles.conversionContainer}>
          <View style={getValueContainerStyle()}>
            <Text style={[styles.valueLabel, { color: COLORS.MUTED }]}>
              {fromUnit}
            </Text>
            <Text style={[styles.valueText, { color: COLORS.PRIMARY_DARK }]}>
              {inputValue}
            </Text>
          </View>

          <IconButton
            name="swap-vertical-outline"
            size={32}
            color={COLORS.ACCENT}
            onPress={handleSwap}
            accessibilityLabel="Swap conversion direction"
            style={styles.swapButton}
          />

          <View style={getValueContainerStyle()}>
            <Text style={[styles.valueLabel, { color: COLORS.MUTED }]}>
              {toUnit}
            </Text>
            <Text style={[styles.valueText, { color: COLORS.PRIMARY_DARK }]}>
              {getConvertedValue()}
            </Text>
          </View>
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('7')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                7
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('8')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                8
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('9')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                9
              </Text>
            </Touchable>
          </View>
          <View style={styles.keypadRow}>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('4')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                4
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('5')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                5
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('6')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                6
              </Text>
            </Touchable>
          </View>
          <View style={styles.keypadRow}>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('1')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                1
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('2')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                2
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('3')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                3
              </Text>
            </Touchable>
          </View>
          <View style={styles.keypadRow}>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={handleToggleSign}
              accessibilityLabel="Toggle sign"
            >
              {/* Keycap text, not an icon: it belongs to the same set as the
                  digit and decimal keys. See docs/NATIVE_REDESIGN.md finding 7. */}
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                +/−
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={() => handleNumberPress('0')}
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                0
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              style={getKeypadButtonStyle()}
              onPress={handleDecimalPress}
              accessibilityLabel="Decimal point"
            >
              <Text
                style={[
                  styles.keypadButtonText,
                  { color: COLORS.PRIMARY_DARK },
                ]}
              >
                .
              </Text>
            </Touchable>
          </View>
          <View style={styles.keypadRow}>
            <Touchable
              accessibilityRole="button"
              style={[
                styles.keypadButton,
                styles.clearButton,
                {
                  backgroundColor: COLORS.ACCENT,
                  borderColor: COLORS.SECONDARY_ACCENT,
                },
              ]}
              onPress={handleClear}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  { color: COLORS.PRIMARY_LIGHT },
                ]}
              >
                Clear
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Backspace"
              style={[
                styles.keypadButton,
                styles.backspaceButton,
                {
                  backgroundColor: COLORS.SECONDARY_ACCENT,
                  borderColor: COLORS.SECONDARY_ACCENT,
                },
              ]}
              onPress={handleBackspace}
            >
              <Ionicons
                name="backspace-outline"
                size={28}
                color={COLORS.PRIMARY_LIGHT}
              />
            </Touchable>
          </View>
        </View>
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  headline: {
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  unitSelectorContainer: {
    width: '100%',
  },
  unitSelector: {
    width: '100%',
    maxHeight: 50,
  },
  unitButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xs,
    borderRadius: RADIUS.tileSmall,
    borderWidth: 1,
  },
  unitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  conversionContainer: {
    width: '90%',
    marginVertical: 5,
  },
  valueContainer: {
    width: '100%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginVertical: 2,
  },
  valueLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
  },
  swapButton: {
    alignSelf: 'center',
  },
  keypad: {
    width: '90%',
    marginTop: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 5,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.5,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '700',
  },
  clearButton: {
    width: '63%',
    aspectRatio: 3,
  },
  clearButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  backspaceButton: {
    width: '32%',
  },
});
