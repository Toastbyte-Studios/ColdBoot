import React, { PropsWithChildren, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { SCREEN_GUTTER, SCREEN_INSET, SPACING } from '../theme';
import ScreenBody from './ScreenBody';

const isAndroid = Platform.OS === 'android';

/**
 * The most of the screen the pinned header may take. Past this (the largest
 * text sizes, a small phone with a tall hero) the list would be left a sliver,
 * so the header scrolls with it instead.
 */
export const MAX_PINNED_SHARE = 0.55;

type Props = PropsWithChildren<{
  /**
   * What stays put at the top: the toolbar, the hero card and the label of
   * the list below. Keep it short: everything here costs list space on a
   * small phone.
   */
  header: React.ReactNode;
  /** Space above the header. @default SPACING.sm */
  topInset?: number;
}>;

/**
 * A screen whose top stays fixed while only the list beneath it scrolls.
 * Home and every module screen use it, so the hero card is always in view
 * and the page doesn't feel like it's all sliding away.
 *
 * On Android both parts bleed to the screen edge, cancelling
 * `ScreenContainer`'s inset, so list rows and their dividers reach the edge;
 * cards in either part carry their own `SCREEN_GUTTER` there. On iOS both
 * parts share the screen gutter.
 *
 * If the header would take more than `MAX_PINNED_SHARE` of the screen, it
 * moves into the scroll view and the whole page scrolls, as before.
 */
export default function PinnedHeaderScreen({
  header,
  topInset = SPACING.sm,
  children,
}: Props) {
  const footerClearance = useFooterClearance();
  const [frameHeight, setFrameHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const pinned =
    frameHeight === 0 ||
    headerHeight <=
      Math.max(0, frameHeight - footerClearance) * MAX_PINNED_SHARE;

  const headerBlock = (
    <View
      style={[styles.gutter, { paddingTop: topInset }]}
      onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
    >
      {header}
    </View>
  );

  return (
    <ScreenBody>
      <View
        style={[styles.frame, isAndroid && styles.bleed]}
        onLayout={(event) => setFrameHeight(event.nativeEvent.layout.height)}
      >
        {pinned ? headerBlock : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: footerClearance }}
        >
          {pinned ? null : headerBlock}
          <View style={styles.gutter}>{children}</View>
        </ScrollView>
      </View>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  bleed: {
    // `width: 'auto'` matters: with an explicit 100% the negative margins
    // would slide the frame sideways instead of widening it.
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  gutter: {
    paddingHorizontal: isAndroid ? 0 : SCREEN_GUTTER,
  },
  scroll: {
    flex: 1,
  },
});
