import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import ModuleHero from '../../components/ModuleHero';
import { useLocalDate } from '../../hooks/useLocalDate';
import { useTheme } from '../../hooks/useTheme';
import { useSignalingStore } from '../../stores/StoreContext';
import { characterOfTheDay, morseSpoken } from './characterOfTheDay';

/** Dots and dashes as the hero draws them, sized to sit beside the headline. */
const DOT = 7;
const DASH = 3 * DOT; // A dash is three dots long, as when it is sent.
const GAP = 5;

/**
 * A character's pattern drawn as dots and dashes, at its true proportions.
 */
function MorsePattern({ morse, color }: { morse: string; color: string }) {
  return (
    <View style={styles.pattern} testID="morse-hero-pattern">
      {morse.split('').map((symbol, index) => (
        <View
          key={index}
          style={[
            styles.symbol,
            { width: symbol === '-' ? DASH : DOT, backgroundColor: color },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The Morse Code screen's hero: one character a day, taught as a sound.
 *
 * The screen was a bare list of four tools. The hero gives it something to
 * learn on the way through: today's character (in the Koch teaching order),
 * how it sounds, and a Play button that sends it with the torch and a tone,
 * the same way Alpha to Morse sends a message. Practice opens the trainer.
 * Below: the one pattern everyone should know, and the two timing rules that
 * make any pattern readable.
 */
const MorseHero = observer(() => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const signaling = useSignalingStore();
  // Rolls over at local midnight, even with the screen left open.
  const today = useLocalDate();

  const { char, morse, sound } = characterOfTheDay(today);
  const sending = signaling.isMorseTransmitting;

  return (
    <ModuleHero
      eyebrow="Character of the day"
      headline={char}
      detail={`${sound}. Learn it as a sound, not a count.`}
      graphic={<MorsePattern morse={morse} color={COLORS.BRAND} />}
      actions={
        <>
          <AppButton
            label={sending ? 'Stop' : 'Play'}
            icon={sending ? 'stop-outline' : 'play-outline'}
            variant={sending ? 'outlined' : 'filled'}
            onPress={() =>
              sending
                ? signaling.stopMorseTransmission()
                : signaling.transmitMorseMessage(morse, true)
            }
            accessibilityLabel={
              sending
                ? 'Stop sending'
                : `Send ${char} with the light and a tone: ${morseSpoken(morse)}`
            }
          />
          <AppButton
            label="Practice"
            icon="school-outline"
            variant="tinted"
            onPress={() => navigation.navigate('MorseTrainer')}
            accessibilityLabel="Open the Morse trainer"
          />
        </>
      }
      stats={[
        {
          label: 'SOS',
          value: '··· ––– ···',
          accessibilityLabel: 'SOS: dot dot dot, dash dash dash, dot dot dot',
        },
        {
          label: 'Dash',
          value: '3 dots long',
          accessibilityLabel: 'A dash is three dots long',
        },
        {
          label: 'Gaps',
          value: 'Letter 3 · Word 7',
          accessibilityLabel:
            'Gaps: three dots between letters, seven between words',
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  pattern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  symbol: {
    height: DOT,
    borderRadius: DOT / 2,
  },
});

export default MorseHero;
