import { useRef } from 'react';
import { useActiveRoute } from '../hooks/useActiveRoute';
import { ScreenHeader, useScreenHeaders } from './ScreenHeaderContext';

/**
 * The header the app bar shows: none on Home, the screen's own everywhere
 * else.
 *
 * A route with nothing registered (the conversion modal, which draws its own
 * header over the bar, or the frame between a push and the new screen's
 * first layout) keeps the last header shown, so the bar never flashes back
 * to the Home layout or an empty title.
 */
export function useAppBarHeader(): ScreenHeader | null {
  const route = useActiveRoute();
  const headers = useScreenHeaders();
  const lastShown = useRef<ScreenHeader | null>(null);

  if (!route || route.name === 'Home') {
    lastShown.current = null;
    return null;
  }
  const registered = headers[route.key];
  if (registered) {
    lastShown.current = registered;
    return registered;
  }
  return lastShown.current ?? { title: '' };
}
