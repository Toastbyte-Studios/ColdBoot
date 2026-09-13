import React, { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_INSET } from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * The screen ground every screen is painted on.
 *
 * iOS gets the brand's vertical gradient. Android gets a flat `surface`:
 * Material separates surfaces by tone, not by depth, and a gradient behind
 * flat tonal containers reads as two design languages arguing.
 *
 * The container's own {@link SCREEN_INSET} padding stays on both platforms, so
 * the ~95 screens that rely on it keep their margins. Screens with full-bleed
 * content cancel it themselves — see `styles.bleed` in the list screens.
 *
 * @param style - Additional styles to apply to the container.
 * @param children - React elements to be rendered inside the container.
 */
export default function ScreenContainer({
  style,
  children,
}: PropsWithChildren<Props>) {
  const COLORS = useTheme();
  const isAndroid = Platform.OS === 'android';

  return (
    <View
      style={[
        styles.base,
        style,
        {
          backgroundColor: isAndroid
            ? COLORS.SURFACE_GROUND
            : COLORS.BACKGROUND,
        },
      ]}
    >
      {isAndroid ? null : (
        <LinearGradient
          colors={COLORS.BACKGROUND_GRADIENT}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    paddingTop: 10,
    paddingHorizontal: SCREEN_INSET,
    alignItems: 'center',
  },
});
