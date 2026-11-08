import React, { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { useTheme } from '../hooks/useTheme';
import { useScreenHeader } from '../navigation/ScreenHeaderContext';
import { SCREEN_GUTTER, SCREEN_INSET, SPACING, TEXT_GUTTER } from '../theme';
import { Text } from './ScaledText';
import ScreenBody from './ScreenBody';
import ScreenToolbar from './ScreenToolbar';

const isAndroid = Platform.OS === 'android';

type Props = PropsWithChildren<{
  /** Shown in the app bar, in place of the ColdBoot wordmark. */
  title: string;
  /**
   * Shown in the app bar under the title, where Home shows the date. For a
   * fact about this screen (a note's date and category, a live reading), not
   * a count or a reminder that it works offline.
   */
  subtitle?: string;
  /**
   * One or two glyph buttons for the screen (add, edit, sort), drawn at the
   * trailing edge of the toolbar row at the top of the content.
   */
  trailing?: React.ReactNode;
  /**
   * A longer set of actions (Notepad's four), laid out from the leading edge
   * of the same toolbar row and wrapping if they need to.
   */
  actions?: React.ReactNode;
  keyboardShouldPersistTaps?: React.ComponentProps<
    typeof ScrollView
  >['keyboardShouldPersistTaps'];
  /**
   * Supporting copy shown between the header and the content, such as a
   * dataset's disclaimer. Quiet muted text: it qualifies the content below,
   * it does not compete with it.
   */
  note?: string;
}>;

/**
 * The shared layout for a screen pushed below a module — a Reference topic,
 * a category, an entry.
 *
 * It is `ModuleScreen`'s frame without the tool list: the title and subtitle
 * go to the app bar (see `ScreenHeaderContext`), then the same
 * scroll view and, on Android, the same edge-to-edge bleed so list rows and
 * their dividers reach the screen edge. Screens below a module used to build
 * their own header and scroll wrapper, which is how they drifted back to the
 * old look while the module screens above them moved on.
 *
 * Children are laid out in the content column. On iOS that column carries the
 * screen gutter; on Android it is full-bleed, so anything that is not a list
 * (a card, a paragraph) should apply its own `SCREEN_GUTTER` there.
 */
export default function StackScreen({
  title,
  subtitle,
  trailing,
  actions,
  keyboardShouldPersistTaps,
  note,
  children,
}: Props) {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  useScreenHeader({ title, subtitle });

  return (
    <ScreenBody>
      <ScrollView
        style={[styles.scroll, isAndroid && styles.bleed]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        <ScreenToolbar actions={actions} trailing={trailing} />

        {note ? (
          <Text
            style={[
              styles.note,
              { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
            ]}
          >
            {note}
          </Text>
        ) : null}

        {children}
      </ScrollView>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  bleed: {
    // See HomeScreen: `width: 'auto'` is what turns the negative margins into
    // extra width rather than a sideways shift.
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  content: {
    paddingHorizontal: isAndroid ? 0 : SCREEN_GUTTER,
    // The title now lives in the app bar; leave a little air under it.
    paddingTop: SPACING.sm,
  },
  note: {
    fontSize: 13.5,
    lineHeight: 19,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
    marginBottom: SPACING.lg,
  },
});
