import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER } from '../theme';
import { withAlpha } from '../theme/colorUtils';
import LogoHeader from './LogoHeader';
import { Text } from './ScaledText';

export type AppBarProps = {
  /** Spotlit by the tutorial. */
  logoRef: React.RefObject<View | null>;
  /** Spotlit by the tutorial. */
  searchRef: React.RefObject<View | null>;
  onHomePress: () => void;
  onSearchPress: () => void;
  onSettingsPress: () => void;
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
 */
export default function AppBar({
  logoRef,
  searchRef,
  onHomePress,
  onSearchPress,
  onSettingsPress,
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
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <LogoHeader size={NAV_BUTTON} />
      </Pressable>

      <View style={styles.titles}>
        <Text style={[styles.wordmark, { color: COLORS.PRIMARY_DARK }]}>
          ColdBoot
        </Text>
        <Text
          style={[styles.date, { color: COLORS.MUTED }]}
          accessibilityLabel={`Current date: ${currentDate}`}
        >
          {currentDate} · Offline ready
        </Text>
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
  date: {
    fontSize: 11.5,
    fontWeight: '500',
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
