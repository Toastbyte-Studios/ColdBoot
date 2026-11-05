import { createContext, useContext } from 'react';

type SettingsSheet = {
  /** Opens the Settings sheet, which holds backup, units and appearance. */
  openSettings: () => void;
};

/**
 * Lets a screen open the Settings sheet. The sheet's visibility lives in
 * AppShell, next to the app bar's settings button that normally opens it; a
 * screen that needs to send the user there (Device Status' backup check)
 * reaches it through this.
 */
export const SettingsSheetContext = createContext<SettingsSheet>({
  openSettings: () => {},
});

export function useSettingsSheet(): SettingsSheet {
  return useContext(SettingsSheetContext);
}
