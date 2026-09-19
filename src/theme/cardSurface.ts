import { Platform, ViewStyle } from 'react-native';
import { ColorScheme } from './colors';
import { RADIUS } from './constants';

const isAndroid = Platform.OS === 'android';

type CardSurfaceOptions = {
  /**
   * A colour that names what the card is about — an imminent event's type, a
   * playing recording. iOS draws it as a 3pt leading edge, the device
   * `AlertsSheet` and the Reference "Do not" card use. Android takes it as the
   * outline instead, since Material keeps colour off edge stripes.
   *
   * It is decoration, not text: it only needs 3:1 against the card.
   */
  accent?: string;
};

/**
 * The redesign's card treatment, as a style to spread onto a card `View`.
 *
 * iOS: an outlined `SURFACE` card. Android: a flat tonal `SURFACE_CONTAINER`
 * with no outline. Both use `RADIUS.card`. This is the surface
 * `SolarCycleCard` and the Reference entry cards already use.
 *
 * It replaces the old `BRAND_GRADIENT` card background. That gradient runs
 * from a mid tone to a dark one in the light scheme and from dark slate to
 * pale steel in the dark scheme, so no single text colour could be read
 * across the whole card — ink fell to 2.2:1 at one end in light mode and
 * 1.8:1 in dark. Every text token the app uses for body copy reaches 4.5:1 on
 * these surfaces in both schemes.
 *
 * Place it after the card's own style so it overrides any legacy border.
 */
export function cardSurface(
  colors: ColorScheme,
  { accent }: CardSurfaceOptions = {},
): ViewStyle {
  if (isAndroid) {
    return {
      backgroundColor: colors.SURFACE_CONTAINER,
      borderRadius: RADIUS.card,
      borderWidth: accent ? 1.5 : 0,
      borderColor: accent ?? 'transparent',
    };
  }

  return {
    backgroundColor: colors.SURFACE,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.BORDER,
    ...(accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null),
  };
}
