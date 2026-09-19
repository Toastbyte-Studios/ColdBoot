import React, { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../../../theme';
import { cardSurface } from '../../../theme/cardSurface';

const isAndroid = Platform.OS === 'android';

type Props = PropsWithChildren<{
  /**
   * Base id for the two nodes tests reach for: `<testID>-keyboard` on the
   * keyboard-avoiding wrapper and `<testID>-card` on the card itself.
   */
  testID?: string;
}>;

/**
 * The card a form's fields sit on inside a {@link StackScreen}.
 *
 * Every form below a module — a pantry item, an inventory item, a contact, a
 * rally point — is the same shape: one `cardSurface` card, its own gutter on
 * Android where `StackScreen` runs full-bleed, and a `KeyboardAvoidingView`
 * so the keyboard does not sit on top of the save row on iOS. Android is left
 * to its own `adjustResize` handling, which is why `behavior` is unset there.
 */
export function FormCard({ testID, children }: Props) {
  const COLORS = useTheme();

  return (
    <KeyboardAvoidingView
      testID={testID ? `${testID}-keyboard` : undefined}
      behavior={isAndroid ? undefined : 'padding'}
      style={styles.container}
    >
      <View
        testID={testID ? `${testID}-card` : undefined}
        style={[styles.card, cardSurface(COLORS)]}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  card: {
    marginTop: SPACING.md,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
});
