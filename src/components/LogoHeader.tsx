import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useIsDarkMode } from '../hooks/useIsDarkMode';
import { RADIUS } from '../theme';
// Static requires: Metro resolves these at build time, so the paths cannot be
// interpolated. Both variants are bundled and the correct one is chosen at
// render time.
const LOGO_DARK = require('../../assets/coldboot-assets/png/dark/icon-96.png');
const LOGO_LIGHT = require('../../assets/coldboot-assets/png/light/icon-96.png');

type Props = {
  /** Tile edge length in points. @default 34 */
  size?: number;
  style?: StyleProp<ImageStyle>;
  shadowStyle?: Partial<ViewStyle>;
};

/**
 * The ColdBoot app mark, as a rounded tile in the nav bar.
 *
 * Was a 120px bordered circle that opened the header; the mark now sits at
 * 34px beside the wordmark, which is what freed the ~260px the old header
 * spent on chrome. The border and bottom margin are gone with it — at this
 * size an outline just muddies the artwork.
 *
 * The mark ships in a light and a dark variant, each carrying its own ground,
 * so the tile is filled by the artwork rather than by a themed background.
 */
export default function LogoHeader({ size = 34, style, shadowStyle }: Props) {
  const isDarkMode = useIsDarkMode();

  // Small tiles take the squircle radius; anything large stays a circle, which
  // is how the mark reads at hero sizes.
  const borderRadius = size <= 48 ? RADIUS.tileSmall : size / 2;

  return (
    <View style={[{ width: size, height: size, borderRadius }, shadowStyle]}>
      <Image
        source={isDarkMode ? LOGO_DARK : LOGO_LIGHT}
        style={[
          styles.base,
          { width: size, height: size, borderRadius },
          style,
        ]}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    resizeMode: 'cover',
  },
});
