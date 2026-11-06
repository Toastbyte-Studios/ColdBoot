import { MenuView } from '@react-native-menu/menu';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER } from '../theme';
import { DARK_COLORS } from '../theme/colors';
import { withAlpha } from '../theme/colorUtils';
import ConnectionDot from './ConnectionDot';
import LogoHeader from './LogoHeader';
import { Text } from './ScaledText';
import type { BackDestination } from '../navigation/backDestinations';
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
   * The nested screen's header. Absent on Home, which keeps the logo,
   * wordmark and date; present everywhere else, where a back control takes
   * the logo's place and the screen's title takes the wordmark's.
   */
  header?: ScreenHeader | null;
  /** Back, when the screen has no `onBack` of its own. */
  onBackPress?: () => void;
  /**
   * The screens behind this one, nearest first. A long press on Back lists
   * them, so a deep screen is one gesture from Home rather than several taps.
   */
  backHistory?: BackDestination[];
  onBackHistorySelect?: (destination: BackDestination) => void;
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
 * On a nested screen the bar becomes that screen's navigation bar: a back
 * control where the logo was, the screen's title where the wordmark was, and
 * the screen's subtitle (when it has one worth showing) where the date was.
 * The large title that used to sit under the bar is gone, so the content
 * starts right below it.
 */
export default function AppBar({
  logoRef,
  searchRef,
  onHomePress,
  onSearchPress,
  onSettingsPress,
  header,
  onBackPress,
  backHistory = [],
  onBackHistorySelect,
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
      {header ? (
        <>
          {/* Touch and hold opens the history menu, like the system back
              button; a tap still goes back one screen. */}
          <MenuView
            shouldOpenOnLongPress
            actions={backHistory.map((destination) => ({
              id: destination.id,
              title: destination.title,
              image: destination.isHome ? 'house' : undefined,
            }))}
            onPressAction={({ nativeEvent }) => {
              const picked = backHistory.find(
                (destination) => destination.id === nativeEvent.event,
              );
              if (picked) onBackHistorySelect?.(picked);
            }}
            // Follows the in-app theme setting rather than the OS.
            themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
          >
            <Pressable
              onPress={header.onBack ?? onBackPress}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint={
                backHistory.length > 1
                  ? 'Touch and hold to jump to an earlier screen'
                  : undefined
              }
              hitSlop={6}
              style={({ pressed }) => [
                navButtonStyle,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back-outline"
                size={19}
                color={COLORS.BRAND}
                style={styles.backGlyph}
              />
            </Pressable>
          </MenuView>

          <View style={styles.titles}>
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
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Pressable
            ref={logoRef}
            onPress={onHomePress}
            accessibilityLabel="Go to home screen"
            accessibilityRole="button"
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <LogoHeader size={NAV_BUTTON} />
          </Pressable>

          <View style={styles.titles}>
            <Text style={[styles.wordmark, { color: COLORS.PRIMARY_DARK }]}>
              ColdBoot
            </Text>
            <View style={styles.dateRow}>
              <Text
                style={[styles.date, { color: COLORS.MUTED }]}
                accessibilityLabel={`Current date: ${currentDate}`}
              >
                {currentDate}
              </Text>
              <ConnectionDot size={7} />
            </View>
          </View>
        </>
      )}

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
    fontSize: 11.5,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 1,
  },
  backGlyph: {
    // The chevron's visual centre sits right of its box; nudge it back.
    marginLeft: -2,
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
