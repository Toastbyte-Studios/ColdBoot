import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SPACING, TEXT_GUTTER } from '../theme';

const isAndroid = Platform.OS === 'android';

type Props = {
  /** Several actions, from the leading edge; they wrap if they need to. */
  actions?: React.ReactNode;
  /** One or two glyph buttons, at the trailing edge. */
  trailing?: React.ReactNode;
};

/**
 * The row of screen actions at the top of a nested screen's content.
 *
 * These buttons (add, edit, sort, bookmarks) used to sit beside the large
 * title. The title moved into the app bar, whose trailing edge already holds
 * search and settings, so the actions keep a row of their own here, still the
 * first thing on the screen. Nothing is drawn when there are none.
 */
export default function ScreenToolbar({ actions, trailing }: Props) {
  if (!actions && !trailing) return null;

  return (
    <View style={styles.row}>
      <View style={styles.actions}>{actions}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
