import { NavigationRouteContext } from '@react-navigation/native';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from 'react';

/** What a nested screen shows in the app bar. */
export type ScreenHeader = {
  title: string;
  /** A fact about this screen (a note's date, a reading), never a count. */
  subtitle?: string;
};

type Registry = Readonly<Record<string, ScreenHeader>>;
type Register = (routeKey: string, header: ScreenHeader | null) => void;

const RegisterContext = createContext<Register>(() => {});
const RegistryContext = createContext<Registry>({});

/**
 * Holds each mounted screen's header, keyed by route.
 *
 * The app bar lives in AppShell, above the navigator, so it cannot read a
 * screen's props. Screens register what they want shown instead, and the bar
 * picks the entry for the route on screen. Keying by route (rather than
 * keeping one "current" header) is what makes going back correct: the screen
 * underneath is still mounted and still registered, so its title is there the
 * moment it is uncovered.
 *
 * Registering and reading are separate contexts so a screen that registers
 * does not re-render when another screen's header changes.
 */
export function ScreenHeaderProvider({ children }: PropsWithChildren) {
  const [registry, setRegistry] = useState<Registry>({});

  const register = useCallback<Register>((routeKey, header) => {
    setRegistry((prev) => {
      if (header === null) {
        if (!(routeKey in prev)) return prev;
        const next = { ...prev };
        delete next[routeKey];
        return next;
      }
      const current = prev[routeKey];
      if (
        current &&
        current.title === header.title &&
        current.subtitle === header.subtitle
      ) {
        return prev;
      }
      return { ...prev, [routeKey]: header };
    });
  }, []);

  return (
    <RegisterContext.Provider value={register}>
      <RegistryContext.Provider value={registry}>
        {children}
      </RegistryContext.Provider>
    </RegisterContext.Provider>
  );
}

/** Every registered header, by route key. For the app bar. */
export function useScreenHeaders(): Registry {
  return useContext(RegistryContext);
}

// Tests that mock @react-navigation/native wholesale leave the route context
// undefined; fall back to an empty one so screens still render there.
const NoRouteContext = createContext<{ key: string } | undefined>(undefined);

/**
 * Shows `header` in the app bar while this screen is on top.
 *
 * Call it from the screen's frame (`StackScreen`, `ModuleScreen`) or from a
 * screen that keeps its own frame. Outside a navigator it does nothing.
 */
export function useScreenHeader({ title, subtitle }: ScreenHeader) {
  const register = useContext(RegisterContext);
  const route = useContext(NavigationRouteContext ?? NoRouteContext);
  const routeKey = route?.key;

  useLayoutEffect(() => {
    if (!routeKey) return;
    register(routeKey, { title, subtitle });
  }, [register, routeKey, title, subtitle]);

  useLayoutEffect(() => {
    if (!routeKey) return;
    return () => register(routeKey, null);
  }, [register, routeKey]);
}
