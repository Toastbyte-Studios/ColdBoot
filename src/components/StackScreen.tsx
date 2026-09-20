import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER, SCREEN_INSET, SPACING, TEXT_GUTTER } from '../theme';
import IconButton from './IconButton';
import { Text } from './ScaledText';
import ScreenBody from './ScreenBody';
import SectionHeader from './SectionHeader';

const isAndroid = Platform.OS === 'android';

type Props = PropsWithChildren<{
  title: string;
  /** Secondary line under the title, e.g. "4 categories · all offline". */
  subtitle?: string;
  /** Rendered at the trailing edge of the title row — a glyph, an action. */
  trailing?: React.ReactNode;
  /**
   * What the back control does, when going back is not popping the screen —
   * a screen that holds several steps of its own, such as Voice Log's record
   * and playback modes, returns to its own starting point instead. The
   * control is always shown when this is set; without it the control appears
   * only when there is a screen to pop.
   */
  onBack?: () => void;
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
 * It is `ModuleScreen`'s frame without the tool list: the same large title
 * with a back control in the headline row, the same scroll view, and on
 * Android the same edge-to-edge bleed so list rows and their dividers reach
 * the screen edge. Screens below a module used to build their own header and
 * scroll wrapper, which is how they drifted back to the old look while the
 * module screens above them moved on.
 *
 * Children are laid out in the content column. On iOS that column carries the
 * screen gutter; on Android it is full-bleed, so anything that is not a list
 * (a card, a paragraph) should apply its own `SCREEN_GUTTER` there.
 */
export default function StackScreen({
  title,
  subtitle,
  trailing,
  onBack,
  keyboardShouldPersistTaps,
  note,
  children,
}: Props) {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

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
        <SectionHeader
          containerStyle={isAndroid ? styles.headline : undefined}
          leading={
            onBack || navigation.canGoBack() ? (
              <IconButton
                name={isAndroid ? 'arrow-back' : 'chevron-back-outline'}
                size={isAndroid ? 24 : 20}
                color={isAndroid ? COLORS.PRIMARY_DARK : COLORS.BRAND}
                onPress={onBack ?? (() => navigation.goBack())}
                accessibilityLabel="Go back"
              />
            ) : undefined
          }
          title={title}
          subtitle={subtitle}
          trailing={
            trailing ? <View style={styles.trailing}>{trailing}</View> : null
          }
        />

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
  },
  headline: {
    paddingHorizontal: TEXT_GUTTER,
    paddingTop: 4,
    paddingBottom: 18,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  note: {
    fontSize: 13.5,
    lineHeight: 19,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.lg,
  },
});
