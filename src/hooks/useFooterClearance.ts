import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOOTER_HEIGHT } from '../theme';

/**
 * Bottom padding a screen needs so its content clears the tab bar.
 *
 * The bar is `FOOTER_HEIGHT` tall and sits on top of the device's bottom
 * inset, so content has to clear both. Screens that use the bare
 * `FOOTER_HEIGHT` constant scroll under the home indicator on devices that
 * have one; prefer this hook wherever a component can call it.
 */
export function useFooterClearance(): number {
  const insets = useSafeAreaInsets();
  return FOOTER_HEIGHT + insets.bottom;
}
