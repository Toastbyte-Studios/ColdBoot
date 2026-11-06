import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { useRippleColor } from '../hooks/useRippleColor';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../theme';
import ConnectionDot from './ConnectionDot';
import IconButton from './IconButton';
import LogoHeader from './LogoHeader';
import { Text } from './ScaledText';
import type { AppBarProps } from './AppBar';

/** M3 small top app bar: 64dp, 12dp gutter, 32dp leading mark. */
const BAR_HEIGHT = 64;
const MARK_SIZE = 32;

/**
 * The Material 3 small top app bar.
 *
 * Two differences from the iOS bar, both of them Material's rules rather than
 * preferences:
 *
 * - **No date.** A top app bar carries a title and actions, nothing else. The
 *   supporting line moves into the content — see `HomeSupportingLine` — where
 *   it scrolls away with everything else instead of pinning a fact that stops
 *   being interesting after the first glance.
 * - **48dp borderless targets.** The iOS bar draws its icon buttons as tinted
 *   circles; Material's are unfilled glyphs with a borderless ripple, sized to
 *   the 48dp target rather than to the glyph.
 *
 * The old help button is gone from here: it lives in Settings → Help, which is
 * where Material puts an action that is neither frequent nor urgent.
 *
 * On a nested screen the leading mark becomes Material's up arrow and the
 * title is the screen's, with its subtitle (when it has one) beneath.
 */
export default function AppBar({
  logoRef,
  searchRef,
  onHomePress,
  onSearchPress,
  onSettingsPress,
  header,
  onBackPress,
}: AppBarProps) {
  const COLORS = useTheme();
  const currentDate = useCurrentDate();
  const insets = useSafeAreaInsets();
  const rippleColor = useRippleColor();

  return (
    <View
      style={[
        styles.bar,
        // The 64dp bar sits below the status bar, not behind it.
        { paddingTop: insets.top, minHeight: BAR_HEIGHT + insets.top },
      ]}
    >
      {header ? (
        <>
          <IconButton
            name="arrow-back"
            size={24}
            color={COLORS.PRIMARY_DARK}
            onPress={header.onBack ?? onBackPress ?? (() => {})}
            accessibilityLabel="Go back"
          />
          <View style={styles.titles}>
            <Text
              style={[styles.title, { color: COLORS.PRIMARY_DARK }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {header.title}
            </Text>
            {header.subtitle ? (
              <Text
                style={[styles.subtitle, { color: COLORS.MUTED }]}
                numberOfLines={1}
              >
                {header.subtitle}
              </Text>
            ) : (
              // No subtitle of its own: the date and connection dot, as on
              // Home's supporting line, so there is always a second line.
              <View style={styles.dateRow}>
                <Text
                  style={[styles.subtitle, { color: COLORS.MUTED }]}
                  accessibilityLabel={`Current date: ${currentDate}`}
                  numberOfLines={1}
                >
                  {currentDate}
                </Text>
                <ConnectionDot />
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <Pressable
            ref={logoRef}
            onPress={onHomePress}
            accessibilityLabel="Go to home screen"
            accessibilityRole="button"
            android_ripple={{
              color: rippleColor,
              borderless: true,
              radius: 24,
            }}
            style={styles.mark}
          >
            <LogoHeader size={MARK_SIZE} />
          </Pressable>

          <Text
            style={[
              styles.title,
              styles.titleFill,
              { color: COLORS.PRIMARY_DARK },
            ]}
          >
            ColdBoot
          </Text>
        </>
      )}

      <View ref={searchRef} collapsable={false}>
        <IconButton
          name="search-outline"
          size={24}
          color={COLORS.PRIMARY_DARK}
          onPress={onSearchPress}
          accessibilityLabel="Search"
        />
      </View>

      <IconButton
        name="settings-outline"
        size={24}
        color={COLORS.PRIMARY_DARK}
        onPress={onSettingsPress}
        accessibilityLabel="Settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  mark: {
    marginLeft: 4,
    borderRadius: MARK_SIZE / 2,
  },
  titles: {
    flex: 1,
  },
  titleFill: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: 21,
    // The design asks for Bitter-SemiBold; only Regular and Bold are bundled,
    // and fontWeight is ignored once a named family is set, so the title takes
    // Bold — the nearest face that ships.
    fontFamily: 'Bitter-Bold',
  },
});
