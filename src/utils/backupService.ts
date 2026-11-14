/**
 * Backup and restore service for ColdBoot app data.
 * Supports exporting all user data to a JSON file and restoring from a backup.
 */

import { Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { z } from 'zod';
import { RepeaterSchema } from './repeaterSchema';
import type {
  CommunicationPlan,
  EmergencyContact,
  Note,
  RallyPoint,
} from '../stores';
import type { BookmarkItem } from '../stores/BookmarksStore';
import type { Checklist, ChecklistItem } from '../stores/ChecklistStore';
import type { InventoryItem } from '../stores/InventoryStore';
import type { PantryItem } from '../stores/PantryStore';
import type { Repeater } from '../stores/RepeaterBookStore';
import type {
  FontSize,
  MeasurementSystem,
  NoteSortOrder,
  ThemeMode,
} from '../stores/SettingsStore';
import type { Track } from '../stores/TrackStore';
import type { Waypoint } from '../stores/WaypointStore';

export const BACKUP_VERSION = '2.0';
export const BACKUP_FILE_PREFIX = 'coldboot-backup-';

/** All version strings that this app can read. */
const SUPPORTED_BACKUP_VERSIONS = ['1.0', '2.0'] as const;

export type RestoreMode = 'replace' | 'merge';

export interface BackupSettings {
  fontSize: FontSize;
  themeMode: ThemeMode;
  noteSortOrder: NoteSortOrder;
  measurementSystem?: MeasurementSystem;
  shortcuts?: string[];
}

/**
 * Full backup data structure stored in the JSON file.
 */
export interface BackupData {
  version: string;
  backupDate: string;
  createdAt: number;
  data: {
    notes: Note[];
    noteCategories: string[];
    checklists: Checklist[];
    checklistItems: ChecklistItem[];
    inventoryItems: InventoryItem[];
    inventoryCategories: string[];
    pantryItems: PantryItem[];
    pantryCategories: string[];
    bookmarks: BookmarkItem[];
    settings: BackupSettings;
    // v2.0 fields
    waypoints: Waypoint[];
    tracks: Track[];
    emergencyContacts: EmergencyContact[];
    rallyPoints: RallyPoint[];
    communicationPlan: CommunicationPlan | null;
    customRepeaters: Repeater[];
  };
}

/**
 * Human-readable summary shown to the user before restoring a backup.
 */
export interface BackupPreview {
  backupDate: string;
  createdAt: number;
  pantryItemCount: number;
  inventoryItemCount: number;
  noteCount: number;
  checklistCount: number;
  bookmarkCount: number;
  waypointCount: number;
  trackCount: number;
  emergencyContactCount: number;
  rallyPointCount: number;
  communicationPlanCount: number;
  customRepeaterCount: number;
}

// ─── Zod schema ──────────────────────────────────────────────────────────────

/**
 * Record schemas for the arrays in a backup.
 *
 * A backup file is the one place the app takes whole records from outside
 * itself, and restore writes them straight into SQLite and into the stores.
 * A record of the wrong shape (a `photoUris` that isn't a list, a missing
 * id) would be stored and then break the screen that renders it on every
 * launch, so each record is checked here and a file with a bad one is
 * rejected before anything is written.
 *
 * Optional fields accept `null` as well as being absent, and come out as
 * `undefined` either way, so a file written by another tool or an older
 * build isn't rejected over the difference.
 */
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);
/** SQLite hands booleans back as 0/1; accept either spelling. */
const booleanLike = z
  .union([z.boolean(), z.number()])
  .transform((value) => Boolean(value));

const NoteSchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  latitude: optionalNumber,
  longitude: optionalNumber,
  category: z.string(),
  type: z.enum(['text', 'sketch', 'voice']),
  title: optionalString,
  text: optionalString,
  bookmarked: booleanLike.optional(),
  sketchDataUri: optionalString,
  // The files themselves aren't in a backup, so a missing or unreadable
  // list is no loss: restore the note without attachments.
  photoUris: z.array(z.string()).catch([]),
  audioUri: optionalString,
  transcription: optionalString,
  duration: optionalNumber,
});

const ChecklistSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.number(),
  isDefault: booleanLike,
});

const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  checklistId: z.string().min(1),
  text: z.string(),
  checked: booleanLike,
  order: z.number().catch(0),
});

/** Inventory and pantry items share a shape. */
const StockItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: optionalString,
  notes: optionalString,
  expirationMonth: optionalNumber,
  expirationYear: optionalNumber,
  createdAt: z.number(),
  updatedAt: z.number(),
});

const BookmarkSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: optionalString,
  createdAt: optionalNumber,
});

/**
 * Zod schema for parsing and validating a backup JSON object.
 *
 * New v2.0 fields use `.default()` so that v1.0 backup files
 * (which omit those fields) are automatically backfilled with empty
 * arrays / null rather than being rejected.
 */
const BackupDataSchema = z.object({
  version: z
    .string()
    .refine(
      (v) => (SUPPORTED_BACKUP_VERSIONS as readonly string[]).includes(v),
      { message: 'Unrecognized backup version' },
    ),
  backupDate: z.string(),
  createdAt: z.number(),
  data: z.object({
    notes: z.array(NoteSchema),
    noteCategories: z.array(z.string()),
    checklists: z.array(ChecklistSchema),
    checklistItems: z.array(ChecklistItemSchema),
    inventoryItems: z.array(StockItemSchema),
    inventoryCategories: z.array(z.string()),
    pantryItems: z.array(StockItemSchema),
    pantryCategories: z.array(z.string()),
    bookmarks: z.array(BookmarkSchema),
    settings: z.object({
      fontSize: z.enum(['small', 'medium', 'large']).catch('small'),
      themeMode: z.enum(['light', 'dark', 'system']).catch('system'),
      noteSortOrder: z
        .enum(['newest-oldest', 'oldest-newest', 'a-z', 'z-a'])
        .catch('newest-oldest'),
      measurementSystem: z
        .enum(['imperial', 'metric'])
        .catch('imperial')
        .optional(),
      shortcuts: z.array(z.string()).optional(),
    }),
    // v2.0 fields – optional with defaults so v1.0 files pass validation
    waypoints: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          createdAt: z.string(),
        }),
      )
      .default([]),
    tracks: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          createdAt: z.string(),
          durationSeconds: z.number(),
          distanceMeters: z.number(),
          points: z.array(
            z.object({
              latitude: z.number(),
              longitude: z.number(),
              altitude: z.number().nullable(),
              timestamp: z.number(),
            }),
          ),
        }),
      )
      .default([]),
    emergencyContacts: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          relationship: z.string(),
          phone: z.string(),
          notes: z.string().optional(),
          createdAt: z.number(),
          updatedAt: z.number(),
        }),
      )
      .default([]),
    rallyPoints: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          coordinates: z.string().optional(),
          createdAt: z.number(),
          updatedAt: z.number(),
        }),
      )
      .default([]),
    communicationPlan: z
      .object({
        whoCallsWhom: z.string(),
        ifPhonesDown: z.string(),
        outOfAreaContact: z.string(),
        checkInSchedule: z.string(),
        updatedAt: z.number(),
      })
      .nullable()
      .default(null),
    customRepeaters: z.array(RepeaterSchema).default([]),
  }),
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a backup data object from the provided store data.
 */
export function createBackupData(
  notes: Note[],
  noteCategories: string[],
  checklists: Checklist[],
  checklistItems: ChecklistItem[],
  inventoryItems: InventoryItem[],
  inventoryCategories: string[],
  pantryItems: PantryItem[],
  pantryCategories: string[],
  bookmarks: BookmarkItem[],
  settings: BackupSettings,
  waypoints: Waypoint[] = [],
  tracks: Track[] = [],
  emergencyContacts: EmergencyContact[] = [],
  rallyPoints: RallyPoint[] = [],
  communicationPlan: CommunicationPlan | null = null,
  customRepeaters: Repeater[] = [],
): BackupData {
  const now = new Date();
  // Use local time components so the date matches the user's local calendar day
  const pad = (n: number) => String(n).padStart(2, '0');
  const backupDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    version: BACKUP_VERSION,
    backupDate,
    createdAt: now.getTime(),
    data: {
      notes,
      noteCategories,
      checklists,
      checklistItems,
      inventoryItems,
      inventoryCategories,
      pantryItems,
      pantryCategories,
      bookmarks,
      settings,
      waypoints,
      tracks,
      emergencyContacts,
      rallyPoints,
      communicationPlan,
      customRepeaters,
    },
  };
}

/**
 * Validates the structure of a parsed backup JSON object.
 * Returns true only if the object matches the expected BackupData shape
 * and has a recognised backup version.
 *
 * As a side-effect, fields introduced in v2.0 that are absent from older
 * v1.0 backup files are backfilled with their zero-value defaults so that
 * callers always see a fully-populated BackupData object.
 */
export function validateBackup(json: unknown): json is BackupData {
  const result = BackupDataSchema.safeParse(json);
  if (!result.success) {
    // Where the file went wrong, never what it contained: a backup holds
    // notes and contacts, and those don't belong in a log.
    console.warn(
      'Backup rejected:',
      result.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.')}: ${issue.code}`)
        .join('; '),
    );
    return false;
  }
  // Backfill any defaults that Zod may have added (e.g. v2.0 fields missing
  // from a v1.0 file) into the original object so callers get a complete value.
  // Typed, so the schema and `BackupData` can't drift apart unnoticed.
  const parsed: BackupData = result.data;
  Object.assign(json as object, parsed);
  return true;
}

/**
 * Creates a human-readable preview of a backup's contents.
 */
export function createBackupPreview(backupData: BackupData): BackupPreview {
  return {
    backupDate: backupData.backupDate,
    createdAt: backupData.createdAt,
    pantryItemCount: backupData.data.pantryItems.length,
    inventoryItemCount: backupData.data.inventoryItems.length,
    noteCount: backupData.data.notes.length,
    checklistCount: backupData.data.checklists.length,
    bookmarkCount: backupData.data.bookmarks.length,
    waypointCount: backupData.data.waypoints.length,
    trackCount: backupData.data.tracks.length,
    emergencyContactCount: backupData.data.emergencyContacts.length,
    rallyPointCount: backupData.data.rallyPoints.length,
    communicationPlanCount: backupData.data.communicationPlan ? 1 : 0,
    customRepeaterCount: backupData.data.customRepeaters.length,
  };
}

/**
 * Returns the platform-specific directory path where backup files are stored.
 * iOS: Documents directory (accessible via Files app)
 * Android: Downloads directory
 */
export function getBackupDirectory(): string {
  return Platform.OS === 'ios'
    ? RNFS.DocumentDirectoryPath
    : RNFS.DownloadDirectoryPath;
}

/**
 * Lists available backup files found in the backup directory,
 * sorted with the most recent first.
 */
export async function listBackupFiles(): Promise<
  { name: string; path: string }[]
> {
  try {
    const dirPath = getBackupDirectory();
    const files = await RNFS.readDir(dirPath);
    return files
      .filter(
        (f) =>
          f.name.startsWith(BACKUP_FILE_PREFIX) &&
          f.name.endsWith('.json') &&
          !f.isDirectory(),
      )
      .map((f) => ({ name: f.name, path: f.path }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

/**
 * Reads and parses a backup file from the given path.
 * Returns null if the file cannot be read or fails validation.
 */
export async function readBackupFile(
  filePath: string,
): Promise<BackupData | null> {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    const json = JSON.parse(content);
    if (!validateBackup(json)) {
      return null;
    }
    return json as BackupData;
  } catch {
    return null;
  }
}

/**
 * Exports a backup by writing it to a temporary file and opening
 * the native share sheet so the user can save it to Files, email it, etc.
 * Both iOS and Android share the file URI so the filename and extension
 * are preserved by all share targets.
 */
export async function exportBackup(backupData: BackupData): Promise<void> {
  const filename = `${BACKUP_FILE_PREFIX}${backupData.backupDate}.json`;
  const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;
  const json = JSON.stringify(backupData, null, 2);
  await RNFS.writeFile(destPath, json, 'utf8');
  await Share.share({ url: `file://${destPath}`, title: filename });
}
