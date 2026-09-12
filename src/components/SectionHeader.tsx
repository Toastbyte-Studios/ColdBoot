import React from 'react';
import { StyleSheet, TextProps, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme';
import { Text } from './ScaledText';
import { TutorialSpotlightContext } from './TutorialSpotlightContext';

type Props = TextProps & {
  /** Rendered before the title block, e.g. a back button. */
  leading?: React.ReactNode;
  title?: string;
  /** Secondary line under the title, e.g. "Six tools · all offline". */
  subtitle?: string;
  /** Rendered at the trailing edge of the title row — a module glyph, an action. */
  trailing?: React.ReactNode;
  /**
   * @deprecated The teal header bar is gone; titles no longer carry a rule.
   * Accepted so existing call sites keep compiling.
   */
  isShowHr?: boolean;
  /**
   * @deprecated Search moved to the nav bar, where it is reachable from every
   * screen rather than only from those that render a header. Accepted so
   * existing call sites keep compiling.
   */
  enableSearch?: boolean;
};

/**
 * A screen's large title.
 *
 * This was a full-width teal bar that doubled as the search affordance — a
 * control that looked like a heading, so the app's title and its search entry
 * point were the same tap target. Search is now an explicit icon button in the
 * nav bar, and this is just a title.
 *
 * The `enableSearch` and `isShowHr` props are retained as no-ops: roughly 84
 * screens render this component, and a signature change would be an 84-file
 * edit for no behavioural gain.
 */
export default function SectionHeader({
  leading,
  title,
  subtitle,
  trailing,
  children,
  style,
  // Accepted and ignored — see the prop docs above.
  isShowHr: _isShowHr,
  enableSearch: _enableSearch,
  ...rest
}: Props) {
  const COLORS = useTheme();
  const { sectionHeaderRef } = React.useContext(TutorialSpotlightContext);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {leading}
        <View style={styles.labels}>
          <View ref={sectionHeaderRef} style={styles.labelContent}>
            <Text
              {...rest}
              style={[styles.title, { color: COLORS.PRIMARY_DARK }, style]}
            >
              {title ?? children}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: COLORS.MUTED }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: SPACING.xs + 2,
    paddingBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  labels: {
    flex: 1,
  },
  labelContent: {
    alignSelf: 'flex-start',
    gap: 3,
  },
  title: {
    fontSize: 32,
    // Bitter-Bold is the bundled face; fontWeight is ignored when a named
    // family is set, so the weight lives in the file name.
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: '400',
  },
});
