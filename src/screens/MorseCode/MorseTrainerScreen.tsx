import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { ColorScheme } from '../../theme/colors';
import { onColor } from '../../theme/colorUtils';

export type TrainerLevel = 'easy' | 'medium' | 'hard';

/**
 * Morse Code Trainer main screen.
 * Allows users to select difficulty level:
 * - Easy: Single character recognition
 * - Medium: Word recognition
 * - Hard: Sentence recognition
 */
export default function MorseTrainerScreen() {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const navigation = useNavigation();

  const handleLevelSelect = (level: TrainerLevel) => {
    // @ts-expect-error - Navigation params typing not fully defined
    navigation.navigate('MorseTrainerLevel', { level });
  };

  return (
    <ScreenBody>
      <SectionHeader>Morse Code Trainer</SectionHeader>

      <View style={styles.container}>
        <Text style={styles.description}>
          Practice your morse code recognition skills. Select a difficulty level
          to begin:
        </Text>

        <View style={styles.levelContainer}>
          <Touchable
            style={[styles.levelButton, styles.easyButton]}
            rippleColor={COLORS.PRIMARY_DARK}
            onPress={() => handleLevelSelect('easy')}
            accessibilityLabel="Easy level - single character"
            accessibilityRole="button"
          >
            <Text style={styles.levelTitle}>EASY</Text>
            <Text style={styles.levelDescription}>
              Single character recognition
            </Text>
          </Touchable>

          <Touchable
            style={[styles.levelButton, styles.mediumButton]}
            rippleColor={onColor(COLORS.SECONDARY_ACCENT)}
            onPress={() => handleLevelSelect('medium')}
            accessibilityLabel="Medium level - word"
            accessibilityRole="button"
          >
            <Text style={[styles.levelTitle, styles.onMedium]}>MEDIUM</Text>
            <Text style={[styles.levelDescription, styles.onMedium]}>
              Word recognition
            </Text>
          </Touchable>

          <Touchable
            style={[styles.levelButton, styles.hardButton]}
            rippleColor={onColor(COLORS.ACCENT)}
            onPress={() => handleLevelSelect('hard')}
            accessibilityLabel="Hard level - sentence"
            accessibilityRole="button"
          >
            <Text style={[styles.levelTitle, styles.onHard]}>HARD</Text>
            <Text style={[styles.levelDescription, styles.onHard]}>
              Sentence recognition
            </Text>
          </Touchable>
        </View>
      </View>
    </ScreenBody>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    description: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      marginBottom: 20,
      textAlign: 'center',
    },
    levelContainer: {
      width: '100%',
      gap: 12,
    },
    levelButton: {
      width: '100%',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: COLORS.BRAND,
      alignItems: 'center',
    },
    easyButton: {
      backgroundColor: COLORS.PRIMARY_LIGHT,
    },
    mediumButton: {
      backgroundColor: COLORS.SECONDARY_ACCENT,
    },
    hardButton: {
      backgroundColor: COLORS.ACCENT,
    },
    // Label colour on the filled levels is measured, not assumed. See
    // docs/NATIVE_REDESIGN.md, "Rules these encode".
    onMedium: {
      color: onColor(COLORS.SECONDARY_ACCENT),
    },
    onHard: {
      color: onColor(COLORS.ACCENT),
    },
    levelTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 4,
    },
    levelDescription: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
    },
  });
