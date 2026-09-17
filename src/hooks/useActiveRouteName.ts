import { useEffect, useState } from 'react';
import { navigationRef } from '../navigation/navigationRef';

function currentRouteName(): string | undefined {
  return navigationRef.isReady()
    ? navigationRef.getCurrentRoute()?.name
    : undefined;
}

/**
 * The name of the route currently on screen.
 *
 * Reads the container ref rather than `useNavigationState`, because `AppShell`
 * wraps the navigator instead of sitting inside it: `useNavigationState` needs
 * a navigator above it and throws there, while the container ref is reachable
 * from anywhere under `NavigationContainer`.
 */
export function useActiveRouteName(): string | undefined {
  const [routeName, setRouteName] = useState<string | undefined>(
    currentRouteName,
  );

  useEffect(() => {
    const sync = () => setRouteName(currentRouteName());
    // The container may not be ready on the first render; sync once now to
    // catch the case where it already is.
    sync();
    return navigationRef.addListener('state', sync);
  }, []);

  return routeName;
}
