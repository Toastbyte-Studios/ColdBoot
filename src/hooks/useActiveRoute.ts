import { useEffect, useState } from 'react';
import { navigationRef } from '../navigation/navigationRef';

export type ActiveRoute = { name: string; key: string };

function currentRoute(): ActiveRoute | undefined {
  if (!navigationRef?.isReady?.()) return undefined;
  const route = navigationRef.getCurrentRoute();
  return route ? { name: route.name, key: route.key } : undefined;
}

function sameRoute(a?: ActiveRoute, b?: ActiveRoute) {
  return a?.key === b?.key && a?.name === b?.name;
}

/**
 * The route on screen, with its key. Like `useActiveRouteName`, it reads the
 * container ref because AppShell sits above the navigator; the key is what
 * tells two instances of the same screen apart (one note pushed over another).
 */
export function useActiveRoute(): ActiveRoute | undefined {
  const [route, setRoute] = useState<ActiveRoute | undefined>(currentRoute);

  useEffect(() => {
    const sync = () =>
      setRoute((prev) => {
        const next = currentRoute();
        return sameRoute(prev, next) ? prev : next;
      });
    sync();
    return navigationRef?.addListener?.('state', sync);
  }, []);

  return route;
}
