import { withAlpha } from '../theme/colorUtils';
import { useIsDarkMode } from './useIsDarkMode';
import { useTheme } from './useTheme';

/**
 * Alpha the Material ripple takes over the brand colour.
 *
 * Dark mode gets the higher value because the ripple is drawn over a dark
 * ground with a pale brand colour: at 12% the wash is barely visible, which
 * makes a tap read as nothing having happened.
 */
const RIPPLE_ALPHA = { light: 0.12, dark: 0.14 } as const;

/**
 * The ripple colour every Android pressable shares.
 *
 * Derived from the brand tint rather than a literal, so it inverts with the
 * scheme along with everything else. Returns a colour on both platforms —
 * `android_ripple` is simply ignored on iOS, so call sites do not have to
 * branch.
 */
export function useRippleColor(): string {
  const COLORS = useTheme();
  const isDarkMode = useIsDarkMode();
  return withAlpha(
    COLORS.BRAND,
    isDarkMode ? RIPPLE_ALPHA.dark : RIPPLE_ALPHA.light,
  );
}
