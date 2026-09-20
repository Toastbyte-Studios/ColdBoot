import { makeAutoObservable, runInAction } from 'mobx';
import { SQLiteDatabase } from '../types/database-types';
import { getToolById } from '../utils/tools';

export type FontSize = 'small' | 'medium' | 'large';
export type ThemeMode = 'light' | 'dark' | 'system';
export type NoteSortOrder = 'newest-oldest' | 'oldest-newest' | 'a-z' | 'z-a';
export type MeasurementSystem = 'imperial' | 'metric';

export const DEFAULT_SHORTCUTS = [
  'core_flashlight',
  'nav_map',
  'core_voice_log',
] as const;

function getFallbackShortcut(slot: number, used: Set<string>): string {
  const preferred = DEFAULT_SHORTCUTS[slot];
  if (!used.has(preferred)) {
    return preferred;
  }

  return (
    DEFAULT_SHORTCUTS.find((toolId) => !used.has(toolId)) ??
    DEFAULT_SHORTCUTS[0]
  );
}

export function resolveShortcutIds(value: unknown): string[] {
  const stored =
    Array.isArray(value) && value.length === DEFAULT_SHORTCUTS.length
      ? value
      : [];
  const used = new Set<string>();

  return DEFAULT_SHORTCUTS.map((_, slot) => {
    const candidate = stored[slot];
    if (
      typeof candidate === 'string' &&
      getToolById(candidate) &&
      !used.has(candidate)
    ) {
      used.add(candidate);
      return candidate;
    }

    const fallback = getFallbackShortcut(slot, used);
    used.add(fallback);
    return fallback;
  });
}

export interface Settings {
  fontSize: FontSize;
  themeMode: ThemeMode;
  noteSortOrder: NoteSortOrder;
  measurementSystem: MeasurementSystem;
  shortcuts: string[];
}

/**
 * Store for managing app settings like font size and theme mode.
 * Settings are persisted to SQLite database.
 */
export class SettingsStore {
  fontSize: FontSize = 'small';
  themeMode: ThemeMode = 'system';
  noteSortOrder: NoteSortOrder = 'newest-oldest';
  measurementSystem: MeasurementSystem = 'imperial';
  shortcuts: string[] = [...DEFAULT_SHORTCUTS];
  lastBackupAt: number | null = null;
  /**
   * When true, new offline map downloads default to the high-detail zoom
   * range (z8–14) instead of the standard range (z8–13). Read by the offline
   * download flow when starting a new pack.
   */
  highDetailOffline: boolean = false;
  private settingsDb: SQLiteDatabase | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /**
   * Sets the font size setting.
   * @param size - The desired font size ('small', 'medium', or 'large')
   */
  async setFontSize(size: FontSize) {
    runInAction(() => {
      this.fontSize = size;
    });
    await this.persistSettings();
  }

  /**
   * Sets the theme mode setting.
   * @param mode - The desired theme mode ('light', 'dark', or 'system')
   */
  async setThemeMode(mode: ThemeMode) {
    runInAction(() => {
      this.themeMode = mode;
    });
    await this.persistSettings();
  }

  /**
   * Sets the note sort order setting.
   * @param order - The desired sort order ('newest-oldest', 'oldest-newest', 'a-z', or 'z-a')
   */
  async setNoteSortOrder(order: NoteSortOrder) {
    runInAction(() => {
      this.noteSortOrder = order;
    });
    await this.persistSettings();
  }

  /**
   * Sets the measurement system setting.
   * @param system - The desired measurement system ('imperial' or 'metric')
   */
  async setMeasurementSystem(system: MeasurementSystem) {
    runInAction(() => {
      this.measurementSystem = system;
    });
    await this.persistSettings();
  }

  async setShortcut(slot: 0 | 1 | 2, toolId: string) {
    if (!getToolById(toolId)) {
      return;
    }

    const nextShortcuts = [...this.shortcuts];
    const existingSlot = nextShortcuts.indexOf(toolId);

    if (existingSlot >= 0 && existingSlot !== slot) {
      [nextShortcuts[slot], nextShortcuts[existingSlot]] = [
        nextShortcuts[existingSlot],
        nextShortcuts[slot],
      ];
    } else {
      nextShortcuts[slot] = toolId;
    }

    runInAction(() => {
      this.shortcuts = nextShortcuts;
    });
    await this.persistSettings();
  }

  async resetShortcuts() {
    runInAction(() => {
      this.shortcuts = [...DEFAULT_SHORTCUTS];
    });
    await this.persistSettings();
  }

  /**
   * Sets whether new offline map downloads should use the high-detail zoom range.
   * @param enabled - True to default future downloads to z8–14, false for z8–13.
   */
  async setHighDetailOffline(enabled: boolean) {
    runInAction(() => {
      this.highDetailOffline = enabled;
    });
    await this.persistSettings();
  }

  /**
   * Records the timestamp of the most recent successful backup.
   * @param timestamp - Unix timestamp (ms) of the backup.
   */
  async setLastBackupAt(timestamp: number) {
    runInAction(() => {
      this.lastBackupAt = timestamp;
    });
    await this.persistSettings();
  }

  async restoreShortcuts(shortcuts: unknown) {
    runInAction(() => {
      this.shortcuts = resolveShortcutIds(shortcuts);
    });
    await this.persistSettings();
  }

  /**
   * Gets the font scale multiplier based on the current font size setting.
   * Small = 1.0 (baseline), Medium = 1.2, Large = 1.4
   */
  get fontScale(): number {
    switch (this.fontSize) {
      case 'small':
        return 1.0;
      case 'medium':
        return 1.2;
      case 'large':
        return 1.4;
      default:
        return 1.0;
    }
  }

  /**
   * Initializes the settings database table if it doesn't exist.
   * Requires the main database to be initialized first.
   */
  async initSettingsDb(db: SQLiteDatabase | null): Promise<void> {
    if (!db) return;
    this.settingsDb = db;
    try {
      await this.settingsDb.executeSql(
        'CREATE TABLE IF NOT EXISTS settings (' +
          'key TEXT PRIMARY KEY NOT NULL, ' +
          'value TEXT NOT NULL' +
          ')',
      );
    } catch (error) {
      console.error('Failed to initialize settings database:', error);
    }
  }

  /**
   * Validates if a value is a valid FontSize
   */
  private isValidFontSize(value: unknown): value is FontSize {
    return (
      typeof value === 'string' && ['small', 'medium', 'large'].includes(value)
    );
  }

  /**
   * Validates if a value is a valid ThemeMode
   */
  private isValidThemeMode(value: unknown): value is ThemeMode {
    return (
      typeof value === 'string' && ['light', 'dark', 'system'].includes(value)
    );
  }

  /**
   * Validates if a value is a valid NoteSortOrder
   */
  private isValidNoteSortOrder(value: unknown): value is NoteSortOrder {
    return (
      typeof value === 'string' &&
      ['newest-oldest', 'oldest-newest', 'a-z', 'z-a'].includes(value)
    );
  }

  /**
   * Validates if a value is a valid MeasurementSystem
   */
  private isValidMeasurementSystem(value: unknown): value is MeasurementSystem {
    return typeof value === 'string' && ['imperial', 'metric'].includes(value);
  }

  /**
   * Loads settings from the database.
   */
  async loadSettings(db: SQLiteDatabase | null): Promise<void> {
    await this.initSettingsDb(db);
    if (!this.settingsDb) return;

    try {
      // Load font size
      const fontSizeRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'fontSize'",
      );
      if (fontSizeRes[0].rows.length > 0) {
        const value = fontSizeRes[0].rows.item(0).value;
        if (this.isValidFontSize(value)) {
          runInAction(() => {
            this.fontSize = value;
          });
        } else {
          console.warn(
            `Invalid fontSize value in database: ${value}, using default 'small'`,
          );
        }
      }

      // Load theme mode
      const themeModeRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'themeMode'",
      );
      if (themeModeRes[0].rows.length > 0) {
        const value = themeModeRes[0].rows.item(0).value;
        if (this.isValidThemeMode(value)) {
          runInAction(() => {
            this.themeMode = value;
          });
        } else {
          console.warn(
            `Invalid themeMode value in database: ${value}, using default 'light'`,
          );
        }
      }

      // Load note sort order
      const noteSortOrderRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'noteSortOrder'",
      );
      if (noteSortOrderRes[0].rows.length > 0) {
        const value = noteSortOrderRes[0].rows.item(0).value;
        if (this.isValidNoteSortOrder(value)) {
          runInAction(() => {
            this.noteSortOrder = value;
          });
        } else {
          console.warn(
            `Invalid noteSortOrder value in database: ${value}, using default 'newest-oldest'`,
          );
        }
      }

      // Load measurement system
      const measurementSystemRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'measurementSystem'",
      );
      if (measurementSystemRes[0].rows.length > 0) {
        const value = measurementSystemRes[0].rows.item(0).value;
        if (this.isValidMeasurementSystem(value)) {
          runInAction(() => {
            this.measurementSystem = value;
          });
        } else {
          console.warn(
            `Invalid measurementSystem value in database: ${value}, using default 'imperial'`,
          );
        }
      }

      // Load high-detail offline preference
      const highDetailOfflineRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'highDetailOffline'",
      );
      if (highDetailOfflineRes[0].rows.length > 0) {
        const value = highDetailOfflineRes[0].rows.item(0).value;
        runInAction(() => {
          this.highDetailOffline = value === 'true';
        });
      }

      // Load last backup timestamp
      const lastBackupRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'lastBackupAt'",
      );
      if (lastBackupRes[0].rows.length > 0) {
        const value = Number(lastBackupRes[0].rows.item(0).value);
        if (!isNaN(value)) {
          runInAction(() => {
            this.lastBackupAt = value;
          });
        }
      }

      const shortcutsRes = await this.settingsDb.executeSql(
        "SELECT value FROM settings WHERE key = 'shortcuts'",
      );
      if (shortcutsRes[0].rows.length > 0) {
        const value = shortcutsRes[0].rows.item(0).value;
        let parsed: unknown;
        try {
          parsed = typeof value === 'string' ? JSON.parse(value) : null;
        } catch {
          parsed = null;
        }
        runInAction(() => {
          this.shortcuts = resolveShortcutIds(parsed);
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Persists current settings to the database.
   */
  async persistSettings(): Promise<void> {
    if (!this.settingsDb) return;

    try {
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('fontSize', ?)",
        [this.fontSize],
      );
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('themeMode', ?)",
        [this.themeMode],
      );
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('noteSortOrder', ?)",
        [this.noteSortOrder],
      );
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('measurementSystem', ?)",
        [this.measurementSystem],
      );
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('shortcuts', ?)",
        [JSON.stringify(this.shortcuts)],
      );
      await this.settingsDb.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('highDetailOffline', ?)",
        [this.highDetailOffline ? 'true' : 'false'],
      );
      if (this.lastBackupAt !== null) {
        await this.settingsDb.executeSql(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('lastBackupAt', ?)",
          [String(this.lastBackupAt)],
        );
      }
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }
}
