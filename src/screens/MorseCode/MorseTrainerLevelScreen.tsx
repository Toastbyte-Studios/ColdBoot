import { useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Sound from 'react-native-sound';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { textToMorse, morseCodeData } from '../../utils/morseCodeMapping';
import { TrainerLevel } from './MorseTrainerScreen';

const isAndroid = Platform.OS === 'android';

type RouteParams = {
  level: TrainerLevel;
};

// Morse code timing constants (in milliseconds)
const MORSE_UNIT_MS = 200; // Base unit for morse code timing (gap between sounds)
const LETTER_SPACE_UNITS = 2; // Additional space between letters (total 3 units)
const WORD_SEPARATOR_UNITS = 6; // Additional space between words (total 7 units)
const FEEDBACK_TIMEOUT_MS = 1500; // Time to display feedback before next challenge

// Training data
const COMMON_WORDS = [
  'SOS',
  'HELP',
  'WATER',
  'FOOD',
  'SAFE',
  'DANGER',
  'YES',
  'NO',
  'STOP',
  'GO',
  'COME',
  'HERE',
  'MORSE',
  'CODE',
  'TEST',
  'RADIO',
  'SIGNAL',
];

const TRAINING_SENTENCES = [
  'SOS NEED HELP',
  'ALL CLEAR',
  'STORM COMING',
  'SAFE HERE',
  'SEND SUPPLIES',
  'RADIO CHECK',
];

/**
 * Generates a random challenge based on the difficulty level.
 */
function generateChallenge(level: TrainerLevel): string {
  if (level === 'easy') {
    // Random single character
    const randomItem =
      morseCodeData[Math.floor(Math.random() * morseCodeData.length)];
    return randomItem.char;
  } else if (level === 'medium') {
    // Random word
    return COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
  } else {
    // Random sentence
    return TRAINING_SENTENCES[
      Math.floor(Math.random() * TRAINING_SENTENCES.length)
    ];
  }
}

/**
 * Morse Code Trainer Level Screen.
 * Plays morse code audio and asks user to identify what was played.
 */
export default function MorseTrainerLevelScreen() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const level = route.params.level;
  const COLORS = useTheme();

  const [challenge, setChallenge] = useState('');
  const [playedChallenge, setPlayedChallenge] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [dotSound, setDotSound] = useState<Sound | null>(null);
  const [dashSound, setDashSound] = useState<Sound | null>(null);
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [soundLoadError, setSoundLoadError] = useState(false);
  const feedbackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const playbackTimeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const isPlayingRef = React.useRef(false);

  // Load sounds on mount
  useEffect(() => {
    Sound.setCategory('Playback');

    let dotLoaded = false;
    let dashLoaded = false;
    let hasError = false;

    const checkBothLoaded = () => {
      if (dotLoaded && dashLoaded) {
        setSoundsLoaded(true);
      } else if (hasError) {
        // If there's an error, set loaded to true so button becomes enabled
        // The error will be shown when user tries to play
        setSoundsLoaded(true);
        setSoundLoadError(true);
      }
    };

    const dot = new Sound('sos_dot.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('Failed to load dot sound', error);
        hasError = true;
        checkBothLoaded();
        return;
      }
      dotLoaded = true;
      checkBothLoaded();
    });

    const dash = new Sound('sos_dash.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('Failed to load dash sound', error);
        hasError = true;
        checkBothLoaded();
        return;
      }
      dashLoaded = true;
      checkBothLoaded();
    });

    setDotSound(dot);
    setDashSound(dash);

    return () => {
      dot.release();
      dash.release();
    };
  }, []);

  // Generate initial challenge
  useEffect(() => {
    setChallenge(generateChallenge(level));
  }, [level]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Clear all playback timeouts
      playbackTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      playbackTimeoutsRef.current = [];
    };
  }, []);

  /**
   * Plays the morse code sequence for the current challenge.
   */
  const playMorseCode = useCallback(async () => {
    if (
      !dotSound ||
      !dashSound ||
      !soundsLoaded ||
      isPlayingRef.current ||
      !challenge
    ) {
      return;
    }

    // Check if there was a sound loading error
    if (soundLoadError) {
      // Show error feedback to user
      setFeedback('incorrect');
      return;
    }

    // Clear any existing playback timeouts
    playbackTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    playbackTimeoutsRef.current = [];

    // Record which challenge we're playing BEFORE starting playback
    setPlayedChallenge(challenge);
    setIsPlaying(true);
    isPlayingRef.current = true;
    const morseCode = textToMorse(challenge);

    // Helper to play a sound with proper stop/start sequence
    const playSound = (sound: Sound): Promise<void> => {
      return new Promise((resolve) => {
        sound.stop(() => {
          sound.play(() => {
            resolve();
          });
        });
      });
    };

    // Helper to create a tracked timeout
    const createTimeout = (
      callback: () => void,
      delay: number,
    ): Promise<void> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          // Remove this timeout from tracking
          playbackTimeoutsRef.current = playbackTimeoutsRef.current.filter(
            (t) => t !== timeout,
          );
          callback();
          resolve();
        }, delay);
        playbackTimeoutsRef.current.push(timeout);
      });
    };

    const playSequence = async (morse: string) => {
      for (let i = 0; i < morse.length; i++) {
        // Check if playback was aborted
        if (!isPlayingRef.current) {
          return;
        }

        const char = morse[i];

        if (char === '.') {
          // Play dot and wait for it to complete
          await playSound(dotSound);
          // Gap after dot
          await createTimeout(() => {}, MORSE_UNIT_MS);
        } else if (char === '-') {
          // Play dash and wait for it to complete
          await playSound(dashSound);
          // Gap after dash
          await createTimeout(() => {}, MORSE_UNIT_MS);
        } else if (char === ' ') {
          // Space between letters (2 more units, total 3)
          await createTimeout(() => {}, MORSE_UNIT_MS * LETTER_SPACE_UNITS);
        } else if (char === '/') {
          // Word separator (6 more units, total 7)
          await createTimeout(() => {}, MORSE_UNIT_MS * WORD_SEPARATOR_UNITS);
        }
      }
    };

    await playSequence(morseCode);

    // Only update state if playback wasn't aborted
    if (isPlayingRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [dotSound, dashSound, soundsLoaded, soundLoadError, challenge]);

  /**
   * Checks the user's answer against the challenge that was played.
   */
  const checkAnswer = () => {
    const normalizedAnswer = userAnswer.trim().toUpperCase();
    const normalizedChallenge = playedChallenge.trim().toUpperCase();

    setAttempts(attempts + 1);

    if (normalizedAnswer === normalizedChallenge) {
      setScore(score + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    // Clear any existing timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Show feedback for 1.5 seconds, then move to next challenge
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      setChallenge(generateChallenge(level));
      feedbackTimeoutRef.current = null;
    }, FEEDBACK_TIMEOUT_MS);
  };

  /**
   * Reveals the answer to the user and moves to next challenge.
   */
  const showAnswer = () => {
    setUserAnswer(playedChallenge);
    setFeedback('incorrect');
    setAttempts(attempts + 1);

    // Clear any existing timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Move to next challenge after showing answer
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      setChallenge(generateChallenge(level));
      feedbackTimeoutRef.current = null;
    }, FEEDBACK_TIMEOUT_MS);
  };

  const getLevelTitle = () => {
    switch (level) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
    }
  };

  const levelSubtitle =
    level === 'easy'
      ? 'Single character'
      : level === 'medium'
        ? 'Word'
        : 'Sentence';

  return (
    <StackScreen
      title={getLevelTitle()}
      subtitle={levelSubtitle}
      note="Press Play to hear the morse code, then enter what you heard and press Submit."
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {/* Score Display */}
        <View style={[styles.scoreCard, cardSurface(COLORS)]}>
          <Text style={styles.scoreText}>
            Score: {score}/{attempts}
            {attempts > 0 && ` (${Math.round((score / attempts) * 100)}%)`}
          </Text>
        </View>

        {/* Play Button */}
        <AppButton
          label={
            isPlaying
              ? 'Playing...'
              : soundLoadError
                ? 'Audio Error'
                : !soundsLoaded
                  ? 'Loading Sounds...'
                  : 'Play Morse Code'
          }
          icon={
            isPlaying
              ? undefined
              : soundLoadError
                ? 'warning-outline'
                : soundsLoaded
                  ? 'play-outline'
                  : undefined
          }
          fullWidth
          onPress={playMorseCode}
          disabled={isPlaying || (!soundsLoaded && !soundLoadError)}
          accessibilityLabel="Play morse code"
          style={styles.playButton}
        />

        {/* Answer Input */}
        <SectionEyebrow>Your answer</SectionEyebrow>
        <TextInput
          style={[
            styles.answerInput,
            cardSurface(COLORS),
            { color: COLORS.PRIMARY_DARK },
          ]}
          placeholder={`Enter ${
            level === 'easy'
              ? 'character'
              : level === 'medium'
                ? 'word'
                : 'sentence'
          }...`}
          placeholderTextColor={COLORS.MUTED}
          value={userAnswer}
          onChangeText={setUserAnswer}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={feedback === null}
          accessibilityLabel="Your answer"
        />

        {/* Feedback */}
        {feedback && (
          <View
            style={[
              styles.feedbackContainer,
              {
                backgroundColor:
                  feedback === 'correct'
                    ? COLORS.SUCCESS_LIGHT
                    : COLORS.ERROR_LIGHT,
              },
            ]}
          >
            <Ionicons
              name={
                feedback === 'correct'
                  ? 'checkmark-circle-outline'
                  : soundLoadError
                    ? 'warning-outline'
                    : 'close-circle-outline'
              }
              size={20}
              color={feedback === 'correct' ? COLORS.SUCCESS : COLORS.ERROR}
            />
            <Text style={styles.feedbackText}>
              {feedback === 'correct'
                ? 'Correct!'
                : soundLoadError
                  ? 'Failed to load audio files. Please restart the app.'
                  : `Incorrect. Answer was: ${playedChallenge}`}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {feedback === null && (
          <View style={styles.buttonContainer}>
            <AppButton
              label="Submit"
              onPress={checkAnswer}
              disabled={userAnswer.trim().length === 0 || !playedChallenge}
              accessibilityLabel="Submit answer"
              style={styles.buttonFlex}
            />
            <AppButton
              label="Show Answer"
              onPress={showAnswer}
              disabled={!playedChallenge}
              variant="secondary"
              accessibilityLabel="Show answer"
              style={styles.buttonFlex}
            />
          </View>
        )}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  scoreCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  playButton: {
    marginBottom: SPACING.lg,
  },
  answerInput: {
    padding: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    marginBottom: SPACING.md,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  buttonFlex: {
    flex: 1,
  },
});
