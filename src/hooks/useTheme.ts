import { reaction } from 'mobx';
import { useEffect, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores';
import { ThemeMode } from '../stores/SettingsStore';
import { LIGHT_COLORS, DARK_COLORS, ColorScheme } from '../theme/colors';

/**
 * Selects the color scheme for a theme mode and the system preference.
 *
 * Exported for components that are already MobX observers of the settings
 * store (such as `ScaledText`'s `Text`) and can resolve the scheme during
 * render, without the per-instance state and reaction `useTheme` sets up.
 */
export function getColorSchemeForThemeMode(
  themeMode: ThemeMode,
  systemColorScheme: ColorSchemeName,
): ColorScheme {
  if (themeMode === 'light') {
    return LIGHT_COLORS;
  } else if (themeMode === 'dark') {
    return DARK_COLORS;
  } else {
    return systemColorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }
}

/**
 * Hook that provides the current theme colors based on the user's theme mode setting.
 *
 * Uses MobX reaction to automatically update when themeMode changes in the SettingsStore,
 * ensuring components re-render with the new theme without needing to be wrapped in observer.
 *
 * - If theme mode is 'light', returns light colors
 * - If theme mode is 'dark', returns dark colors
 * - If theme mode is 'system', returns colors based on system color scheme
 *
 * @returns The current color scheme object
 */
export function useTheme(): ColorScheme {
  const settingsStore = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const [colors, setColors] = useState<ColorScheme>(() =>
    getColorSchemeForThemeMode(settingsStore.themeMode, systemColorScheme),
  );

  useEffect(() => {
    // Use MobX reaction to track changes to themeMode
    const dispose = reaction(
      () => settingsStore.themeMode,
      (themeMode) => {
        const newColors = getColorSchemeForThemeMode(
          themeMode,
          systemColorScheme,
        );
        setColors(newColors);
      },
      {
        fireImmediately: false, // Don't fire on initial setup since we already set initial state
      },
    );

    // Also update when system color scheme changes
    const newColors = getColorSchemeForThemeMode(
      settingsStore.themeMode,
      systemColorScheme,
    );
    setColors(newColors);

    return dispose;
  }, [settingsStore, systemColorScheme]);

  return colors;
}
