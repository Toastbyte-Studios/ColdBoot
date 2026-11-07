import { useActiveRoute } from '../hooks/useActiveRoute';
import { navigationRef } from './navigationRef';
import { ScreenHeader, useScreenHeaders } from './ScreenHeaderContext';

/** A screen further back in the stack, as the long-press menu lists it. */
export type BackDestination = {
  /** The route key; stable for as long as the screen is in the stack. */
  id: string;
  title: string;
  /** How many screens to pop to land on it. */
  popCount: number;
  isHome: boolean;
};

type StackRoute = { key: string; name: string };

/** "PantryCategory" → "Pantry Category", for a screen with no title. */
function titleFromRouteName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Every screen behind the current one, nearest first and Home last: the
 * order iOS's own back-button menu uses, so the one you most likely want is
 * right under your thumb. Titles are the ones each screen showed in the app
 * bar.
 */
export function backDestinations(
  routes: readonly StackRoute[],
  index: number,
  headers: Readonly<Record<string, ScreenHeader>>,
): BackDestination[] {
  const destinations: BackDestination[] = [];
  for (let i = index - 1; i >= 0; i--) {
    const route = routes[i];
    const title =
      route.name === 'Home'
        ? 'Home'
        : headers[route.key]?.title || titleFromRouteName(route.name);
    destinations.push({
      id: route.key,
      title,
      popCount: index - i,
      isHome: route.name === 'Home',
    });
  }
  return destinations;
}

/**
 * The screens Back can jump to, kept current as the stack changes. Reads the
 * root stack through the container ref, since AppShell sits above the
 * navigator.
 */
export function useBackDestinations(): BackDestination[] {
  // Re-renders whenever the focused route changes, which is when the stack
  // behind it can have changed too.
  useActiveRoute();
  const headers = useScreenHeaders();
  if (!navigationRef?.isReady?.()) return [];
  const state = navigationRef.getRootState();
  if (!state) return [];
  return backDestinations(
    state.routes as StackRoute[],
    state.index ?? state.routes.length - 1,
    headers,
  );
}
