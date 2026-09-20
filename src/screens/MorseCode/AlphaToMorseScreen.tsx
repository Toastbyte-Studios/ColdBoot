import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Platform, StyleSheet, View, TextInput } from 'react-native';
import AppButton from '../../components/AppButton';
import AppSwitch from '../../components/AppSwitch';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useSignalingStore } from '../../stores/StoreContext';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { textToMorse } from '../../utils/morseCodeMapping';

const isAndroid = Platform.OS === 'android';

const MAX_CHARACTERS = 300;

/**
 * Alpha to Morse screen allows users to input text and transmit it as morse code.
 *
 * Features:
 * - Text input with 300 character limit
 * - Submit button to start morse code transmission
 * - Sound toggle (default on)
 * - Uses flashlight and optional sound to transmit morse code
 * - References SOS implementation for morse code transmission
 */
const AlphaToMorseScreenImpl = () => {
  const COLORS = useTheme();
  const core = useSignalingStore();
  const [message, setMessage] = useState('');
  const [morseWithTone, setMorseWithTone] = useState(true);

  const handleMessageChange = (text: string) => {
    if (text.length <= MAX_CHARACTERS) {
      setMessage(text);
    }
  };

  const handleSubmit = () => {
    if (message.trim().length === 0) {
      return;
    }

    const morseCode = textToMorse(message);
    core.transmitMorseMessage(morseCode, morseWithTone);
  };

  const isTransmitting = core.isMorseTransmitting;
  const remainingChars = MAX_CHARACTERS - message.length;

  return (
    <StackScreen
      title="Alpha to Morse"
      subtitle="Flashes the torch, and optionally beeps"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.column}>
        <SectionEyebrow>Message</SectionEyebrow>
        <TextInput
          style={[
            styles.textInput,
            cardSurface(COLORS),
            { color: COLORS.PRIMARY_DARK },
          ]}
          placeholder="Enter your message..."
          placeholderTextColor={COLORS.MUTED}
          value={message}
          onChangeText={handleMessageChange}
          multiline
          maxLength={MAX_CHARACTERS}
          editable={!isTransmitting}
          accessibilityLabel="Message to transmit"
        />
        <Text style={[styles.charCounter, { color: COLORS.MUTED }]}>
          {remainingChars} characters remaining
        </Text>

        <SectionEyebrow style={styles.eyebrow}>Transmission</SectionEyebrow>
        <View style={[styles.switchRow, cardSurface(COLORS)]}>
          <Text style={styles.controlLabel}>Play a tone</Text>
          <AppSwitch
            value={morseWithTone}
            onValueChange={setMorseWithTone}
            tint={COLORS.ACCENT}
            offTint={COLORS.SECONDARY_ACCENT}
            thumbColor={morseWithTone ? COLORS.PRIMARY_LIGHT : COLORS.BRAND}
            disabled={isTransmitting}
            accessibilityLabel="Play a tone while transmitting morse"
          />
        </View>

        <AppButton
          label={isTransmitting ? 'Transmitting…' : 'Submit'}
          size="large"
          fullWidth
          disabled={message.trim().length === 0 || isTransmitting}
          onPress={handleSubmit}
          style={styles.submitButton}
        />

        {isTransmitting && (
          <AppButton
            label="Stop"
            size="large"
            tint={COLORS.BRAND}
            fullWidth
            onPress={() => core.stopMorseTransmission()}
            accessibilityLabel="Stop transmission"
          />
        )}
      </View>
    </StackScreen>
  );
};

export default observer(AlphaToMorseScreenImpl);

const styles = StyleSheet.create({
  column: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  eyebrow: {
    marginTop: SPACING.lg,
  },
  textInput: {
    padding: SPACING.md,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    borderRadius: RADIUS.card,
  },
  charCounter: {
    fontSize: 13,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  controlLabel: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    marginBottom: SPACING.md,
  },
});
