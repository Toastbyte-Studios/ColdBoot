import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';

const HIDDEN_KEYS_STORAGE_KEY = '@notifications/hidden_keys';

/**
 * Unified notification type that aggregates all in-app alert sources
 * (solar events, weather, astronomy, pantry expiration) into a single model.
 */
export type AppNotificationType = 'solar' | 'weather' | 'astronomy' | 'pantry';

export interface AppNotification {
  /** Stable key used to persist hidden state across sessions. */
  key: string;
  type: AppNotificationType;
  /** Ionicons outline icon name. */
  icon: string;
  iconColor: string;
  message: string;
  /** Whether the user is allowed to dismiss this notification. */
  dismissible: boolean;
  /** Optional background highlight color (e.g., for expiring pantry items). */
  highlightColor?: string;
}

/**
 * Store that tracks which in-app notification keys the user has hidden.
 * Hidden keys are persisted via AsyncStorage so dismissed notifications
 * do not reappear after the app is restarted.
 *
 * This store does **not** own the notifications themselves — those remain in
 * their respective domain stores (SolarCycleNotificationStore, PantryStore,
 * etc.). It only records the user's hide decisions.
 */
export class NotificationsStore {
  /** Set of notification keys the user has chosen to hide. */
  hiddenKeys: Set<string> = new Set();

  private _loaded = false;
  /**
   * Internal promise chain used to serialize AsyncStorage writes so that
   * rapid successive hide/unhide calls never clobber each other.
   */
  private _persistChain: Promise<void> = Promise.resolve();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /**
   * Load persisted hidden keys from AsyncStorage.
   * Call once on app start (wired through RootStore.initializeSettings).
   */
  async loadHiddenKeys(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(HIDDEN_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const validKeys = Array.isArray(parsed)
          ? parsed.filter((v): v is string => typeof v === 'string')
          : [];
        runInAction(() => {
          this.hiddenKeys = new Set(validKeys);
        });
      }
    } catch (e) {
      console.warn('NotificationsStore: failed to load hidden keys', e);
    } finally {
      runInAction(() => {
        this._loaded = true;
      });
    }
  }

  /** Whether hidden keys have been loaded from storage. */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /** Returns true when this notification key has been hidden by the user. */
  isHidden(key: string): boolean {
    return this.hiddenKeys.has(key);
  }

  /**
   * Mark a notification as hidden.  The change is persisted immediately so it
   * survives app restarts and modal close/reopen cycles.
   */
  hideNotification(key: string): void {
    if (this.hiddenKeys.has(key)) {
      return;
    }
    runInAction(() => {
      this.hiddenKeys = new Set([...this.hiddenKeys, key]);
    });
    this._persist();
  }

  /**
   * Restore a previously hidden notification (un-dismiss it).
   */
  unhideNotification(key: string): void {
    if (!this.hiddenKeys.has(key)) {
      return;
    }
    runInAction(() => {
      const updated = new Set(this.hiddenKeys);
      updated.delete(key);
      this.hiddenKeys = updated;
    });
    this._persist();
  }

  /** Remove all hidden-key records (resets the store to pristine state). */
  clearHiddenKeys(): void {
    runInAction(() => {
      this.hiddenKeys = new Set();
    });
    this._persist();
  }

  private _persist(): void {
    // Snapshot current state immediately so the written value is always the
    // state at the time _persist() was called, not at some later tick.
    const snapshot = [...this.hiddenKeys];
    // Chain onto the previous persist so writes are always serialized and the
    // last caller's snapshot wins even when multiple updates arrive quickly.
    this._persistChain = this._persistChain
      .then(() =>
        AsyncStorage.setItem(HIDDEN_KEYS_STORAGE_KEY, JSON.stringify(snapshot)),
      )
      .catch((e) =>
        console.warn('NotificationsStore: failed to persist hidden keys', e),
      );
  }
}
