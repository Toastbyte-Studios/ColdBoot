import React, { useEffect } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import Sound from 'react-native-sound';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';

const isAndroid = Platform.OS === 'android';

/**
 * DigitalWhistleScreen component
 *
 * Provides two types of whistles:
 * - Normal Whistle (using placeholder tone)
 * - Dog Whistle (using placeholder tone)
 *
 * Note: Currently uses placeholder morse code sounds. Production implementation
 * would use custom whistle sound files at appropriate frequencies (e.g., 3000 Hz
 * for normal whistle and 20000 Hz for dog whistle).
 *
 * Each whistle has two modes:
 * - Short Burst: Plays once
 * - Continuous: Loops until stopped
 *
 * @returns A React element rendering the digital whistle screen.
 */
export default function DigitalWhistleScreen() {
  const COLORS = useTheme();
  const [isPlayingNormal, setIsPlayingNormal] = React.useState(false);
  const [isPlayingDog, setIsPlayingDog] = React.useState(false);
  const normalSoundRef = React.useRef<Sound | null>(null);
  const dogSoundRef = React.useRef<Sound | null>(null);

  /**
   * Initialize sounds on component mount
   */
  useEffect(() => {
    // Enable playback in silent mode
    Sound.setCategory('Playback');

    // Use the existing morse code sounds as a placeholder
    // In a real implementation, you would add custom whistle sound files
    normalSoundRef.current = new Sound(
      'sos_dash.wav',
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.error('Failed to load normal whistle sound:', error);
        }
      },
    );

    // 18kHz tone for dog whistle - high frequency audible to dogs
    dogSoundRef.current = new Sound(
      'dog_whistle.wav',
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.error('Failed to load dog whistle sound:', error);
        }
      },
    );

    return () => {
      // Cleanup on unmount
      if (normalSoundRef.current) {
        normalSoundRef.current.stop();
        normalSoundRef.current.release();
      }
      if (dogSoundRef.current) {
        dogSoundRef.current.stop();
        dogSoundRef.current.release();
      }
    };
  }, []);

  /**
   * Plays a short burst of whistle sound
   * @param isNormal - True for normal whistle, false for dog whistle
   */
  const playShortBurst = React.useCallback((isNormal: boolean) => {
    const sound = isNormal ? normalSoundRef.current : dogSoundRef.current;

    if (!sound) {
      Alert.alert('Error', 'Sound not loaded yet. Please try again.');
      return;
    }

    sound.stop(() => {
      // Reset loop count to ensure short burst plays once
      sound.setNumberOfLoops(0);
      sound.play((success) => {
        if (!success) {
          console.error('Playback failed');
        }
      });
    });
  }, []);

  /**
   * Starts continuous whistle playback using looping
   * @param isNormal - True for normal whistle, false for dog whistle
   */
  const startContinuous = React.useCallback((isNormal: boolean) => {
    const sound = isNormal ? normalSoundRef.current : dogSoundRef.current;

    if (!sound) {
      Alert.alert('Error', 'Sound not loaded yet. Please try again.');
      return;
    }

    // Stop any existing playback
    sound.stop(() => {
      // Set to loop continuously
      sound.setNumberOfLoops(-1);

      // Start playing
      sound.play((success) => {
        if (!success) {
          console.error('Playback failed');
          if (isNormal) {
            setIsPlayingNormal(false);
          } else {
            setIsPlayingDog(false);
          }
        }
      });

      // Update state
      if (isNormal) {
        setIsPlayingNormal(true);
      } else {
        setIsPlayingDog(true);
      }
    });
  }, []);

  /**
   * Stops continuous whistle playback
   * @param isNormal - True for normal whistle, false for dog whistle
   */
  const stopContinuous = React.useCallback((isNormal: boolean) => {
    const sound = isNormal ? normalSoundRef.current : dogSoundRef.current;

    if (sound) {
      sound.stop(() => {
        // Reset loop count
        sound.setNumberOfLoops(0);
      });
    }

    if (isNormal) {
      setIsPlayingNormal(false);
    } else {
      setIsPlayingDog(false);
    }
  }, []);

  return (
    <StackScreen
      title="Digital Whistle"
      note="Placeholder tones for now. Hold the phone away from your ears before starting a continuous whistle."
    >
      <SectionEyebrow>Normal whistle</SectionEyebrow>
      <View style={[styles.card, cardSurface(COLORS)]}>
        <Text style={[styles.description, { color: COLORS.MUTED }]}>
          Standard whistle tone — audible to humans.
        </Text>
        <View style={styles.buttonRow}>
          <AppButton
            label="Short Burst"
            onPress={() => playShortBurst(true)}
            icon="flash-outline"
            style={styles.buttonFlex}
          />
          <AppButton
            label={isPlayingNormal ? 'Stop' : 'Continuous'}
            onPress={() => {
              if (isPlayingNormal) {
                stopContinuous(true);
              } else {
                startContinuous(true);
              }
            }}
            variant={isPlayingNormal ? 'destructive' : 'primary'}
            icon={isPlayingNormal ? 'stop' : 'play'}
            style={styles.buttonFlex}
          />
        </View>
      </View>

      <SectionEyebrow style={styles.eyebrow}>Dog whistle</SectionEyebrow>
      <View style={[styles.card, cardSurface(COLORS)]}>
        <Text style={[styles.description, { color: COLORS.MUTED }]}>
          High frequency tone — may be less audible to humans.
        </Text>
        <View style={styles.buttonRow}>
          <AppButton
            label="Short Burst"
            onPress={() => playShortBurst(false)}
            icon="flash-outline"
            style={styles.buttonFlex}
          />
          <AppButton
            label={isPlayingDog ? 'Stop' : 'Continuous'}
            onPress={() => {
              if (isPlayingDog) {
                stopContinuous(false);
              } else {
                startContinuous(false);
              }
            }}
            variant={isPlayingDog ? 'destructive' : 'primary'}
            icon={isPlayingDog ? 'stop' : 'play'}
            style={styles.buttonFlex}
          />
        </View>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  eyebrow: {
    marginTop: SPACING.lg,
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  buttonFlex: {
    flex: 1,
  },
});
