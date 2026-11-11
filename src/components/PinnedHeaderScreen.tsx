import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { ROW_MIN_HEIGHT, SCREEN_GUTTER, SCREEN_INSET, SPACING } from '../theme';
import ScreenBody from './ScreenBody';

const isAndroid = Platform.OS === 'android';

/**
 * The least list the pinned header must leave visible, in rows. The header
 * may take as much of the screen as it needs so long as this many rows still
 * fit beneath it; the half row hints that the list scrolls. Only when even
 * that won't fit (the largest text sizes on a small phone) does the header
 * scroll with the list.
 */
export const MIN_LIST_ROWS = 2.5;

/** `MIN_LIST_ROWS` in points, using the platform's grouped-row height. */
export const MIN_LIST_HEIGHT = ROW_MIN_HEIGHT * MIN_LIST_ROWS;

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
 * The list takes all the height the header leaves, above the shortcut bar,
 * and scrolls within it. Only if that would be less than `MIN_LIST_HEIGHT`
 * does the header scroll with the whole page instead. Both scroll views stay
 * mounted so changing modes preserves the header's loaded state.
 */
export default function PinnedHeaderScreen({
  header,
  topInset = SPACING.sm,
  children,
}: Props) {
  const footerClearance = useFooterClearance();
  const [frameHeight, setFrameHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const pageScroll = useRef<ScrollView>(null);
  const listScroll = useRef<ScrollView>(null);
  const pinned =
    frameHeight === 0 ||
    frameHeight - footerClearance - headerHeight >= MIN_LIST_HEIGHT;

  useEffect(() => {
    pageScroll.current?.scrollTo({ y: 0, animated: false });
    listScroll.current?.scrollTo({ y: 0, animated: false });
  }, [pinned]);

  return (
    <ScreenBody>
      <View
        style={[styles.frame, isAndroid && styles.bleed]}
        onLayout={(event) => setFrameHeight(event.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={pageScroll}
          style={styles.scroll}
          contentContainerStyle={pinned && styles.pinnedContent}
          scrollEnabled={!pinned}
          scrollsToTop={!pinned}
          bounces={!pinned}
        >
          <View
            style={[styles.gutter, { paddingTop: topInset }]}
            onLayout={(event) =>
              setHeaderHeight(event.nativeEvent.layout.height)
            }
          >
            {header}
          </View>
          <ScrollView
            ref={listScroll}
            style={pinned ? styles.scroll : styles.expandedList}
            contentContainerStyle={{ paddingBottom: footerClearance }}
            scrollEnabled={pinned}
            scrollsToTop={pinned}
            bounces={pinned}
          >
            <View style={styles.gutter}>{children}</View>
          </ScrollView>
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
  pinnedContent: {
    flex: 1,
  },
  expandedList: {
    flexGrow: 0,
    flexShrink: 0,
  },
});
