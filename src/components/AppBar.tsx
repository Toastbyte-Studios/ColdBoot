import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER } from '../theme';
import { withAlpha } from '../theme/colorUtils';
import ConnectionDot from './ConnectionDot';
import LogoHeader from './LogoHeader';
import { Text } from './ScaledText';
import type { ScreenHeader } from '../navigation/ScreenHeaderContext';

export type AppBarProps = {
  /** Spotlit by the tutorial. */
  logoRef: React.RefObject<View | null>;
  /** Spotlit by the tutorial. */
  searchRef: React.RefObject<View | null>;
  onHomePress: () => void;
  onSearchPress: () => void;
  onSettingsPress: () => void;
  /**
   * The nested screen's header. Absent on Home, which shows the wordmark and
   * date; present everywhere else, where the screen's title takes the
   * wordmark's place. The logo stays either way and always goes Home; going
   * back is the swipe.
   */
  header?: ScreenHeader | null;
};

/** Edge length of the bar's circular icon buttons. */
const NAV_BUTTON = 34;

/**
 * The app's top bar.
 *
 * Replaces a header that spent roughly 260px on a date, two icon buttons, a
 * 120px logo circle and a full-width bar that was secretly the search field.
 * The same affordances now fit in one 34pt row, which is the space the solar
 * card and module list took over.
 *
 * iOS keeps the date inside the bar, under the wordmark, the way a nav-bar
 * subtitle sits. Android overrides this file: Material puts a supporting line
 * in the content instead, where it scrolls away.
 *
 * On a nested screen the screen's title takes the wordmark's place and its
 * subtitle (when it has one worth showing) the date's. The logo stays put on
 * every screen as the way Home; there is no back button, because the swipe
 * already goes back.
 */
export default function AppBar({
  logoRef,
  searchRef,
  onHomePress,
  onSearchPress,
  onSettingsPress,
  header,
}: AppBarProps) {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const currentDate = useCurrentDate();

  const navButtonStyle = [
    styles.navButton,
    {
      backgroundColor: withAlpha(COLORS.BRAND, 0.1),
      borderColor: withAlpha(COLORS.BRAND, 0.18),
    },
  ];

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 14 }]}>
      <Pressable
        ref={logoRef}
        onPress={onHomePress}
        accessibilityLabel="Go to home screen"
        accessibilityRole="button"
        hitSlop={6}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <LogoHeader size={NAV_BUTTON} />
      </Pressable>

      <View style={styles.titles}>
        {header ? (
          <>
            <Text
              style={[styles.wordmark, { color: COLORS.PRIMARY_DARK }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {header.title}
            </Text>
            {header.subtitle ? (
              <Text
                style={[styles.date, styles.subtitle, { color: COLORS.MUTED }]}
                numberOfLines={1}
              >
                {header.subtitle}
              </Text>
            ) : (
              // No subtitle of its own: keep the line, with Home's date and
              // connection dot, so the bar is the same height everywhere.
              <DateLine date={currentDate} color={COLORS.MUTED} />
            )}
          </>
        ) : (
          <>
            <Text style={[styles.wordmark, { color: COLORS.PRIMARY_DARK }]}>
              ColdBoot
            </Text>
            <DateLine date={currentDate} color={COLORS.MUTED} />
          </>
        )}
      </View>

      <Pressable
        ref={searchRef}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Search"
        style={({ pressed }) => [navButtonStyle, pressed && styles.pressed]}
      >
        <Ionicons name="search-outline" size={17} color={COLORS.BRAND} />
      </Pressable>

      <Pressable
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        style={({ pressed }) => [navButtonStyle, pressed && styles.pressed]}
      >
        <Ionicons name="settings-outline" size={17} color={COLORS.BRAND} />
      </Pressable>
    </View>
  );
}

/** The date and the connection dot, under the wordmark or a bare title. */
function DateLine({ date, color }: { date: string; color: string }) {
  return (
    <View style={styles.dateRow}>
      <Text
        style={[styles.date, { color }]}
        accessibilityLabel={`Current date: ${date}`}
        numberOfLines={1}
      >
        {date}
      </Text>
      <ConnectionDot size={7} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 10,
  },
  titles: {
    flex: 1,
  },
  wordmark: {
    fontSize: 17,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  date: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 1,
  },
  navButton: {
    width: NAV_BUTTON,
    height: NAV_BUTTON,
    borderRadius: NAV_BUTTON / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
