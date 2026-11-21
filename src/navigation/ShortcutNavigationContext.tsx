import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useRef,
} from 'react';

type Departure = () => void;
type Guard = (departure: Departure) => boolean;

type ShortcutNavigation = {
  register: (guard: Guard) => () => void;
  navigate: (departure: Departure) => void;
};

const ShortcutNavigationContext = createContext<ShortcutNavigation>({
  register: () => () => {},
  navigate: (departure) => departure(),
});

export function ShortcutNavigationProvider({ children }: PropsWithChildren) {
  const guard = useRef<Guard | null>(null);
  const value = useMemo<ShortcutNavigation>(
    () => ({
      register: (next) => {
        guard.current = next;
        return () => {
          if (guard.current === next) guard.current = null;
        };
      },
      navigate: (departure) => {
        if (!guard.current?.(departure)) departure();
      },
    }),
    [],
  );
  return (
    <ShortcutNavigationContext.Provider value={value}>
      {children}
    </ShortcutNavigationContext.Provider>
  );
}

export function useShortcutNavigation() {
  return useContext(ShortcutNavigationContext);
}
