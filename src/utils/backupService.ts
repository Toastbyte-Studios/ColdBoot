/**
 * Backup and restore service for ColdBoot app data.
 * Supports exporting all user data to a JSON file and restoring from a backup.
 */

import { Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { normalizeBarcode } from './barcode';
import {
  attachmentUris,
  deleteAttachmentFiles,
  isNoteAttachmentUri,
  resolveOwnedAttachmentPath,
} from './noteAttachments';
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

export const BACKUP_VERSION = '3.0';
export const BACKUP_FILE_PREFIX = 'coldboot-backup-';

const currentSessionExportPaths = new Set<string>();

/** All version strings that this app can read. */
const SUPPORTED_BACKUP_VERSIONS = ['1.0', '2.0', '3.0'] as const;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export type RestoreMode = 'replace' | 'merge';
export type BackupExportResult = 'shared' | 'dismissed' | 'unconfirmed';

export interface BackupSettings {
  fontSize: FontSize;
  themeMode: ThemeMode;
  noteSortOrder: NoteSortOrder;
  measurementSystem?: MeasurementSystem;
  shortcuts?: string[];
}

export interface BackupAttachment {
  uris: string[];
  contentBase64: string;
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
    // v3.0 fields
    attachments: BackupAttachment[];
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

/**
 * Pantry items add product facts. All optional, so backups written before
 * these fields existed restore unchanged.
 */
const PantryItemSchema = StockItemSchema.extend({
  barcode: z
    .string()
    .nullish()
    .transform((value, ctx) => {
      if (value == null || value.trim() === '') return undefined;
      const normalized = normalizeBarcode(value);
      if (normalized === null) {
        ctx.addIssue({ code: 'custom', message: 'Invalid barcode' });
        return z.NEVER;
      }
      return normalized;
    }),
  brand: optionalString,
  servingSize: optionalString,
  caloriesPerServing: z
    .number()
    .nonnegative()
    .nullish()
    .transform((value) => value ?? undefined),
  servingsPerUnit: z
    .number()
    .positive()
    .nullish()
    .transform((value) => value ?? undefined),
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
 * Newer fields use `.default()` so that older backup files
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
    pantryItems: z.array(PantryItemSchema),
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
    attachments: z
      .array(
        z.object({
          uris: z.array(z.string().min(1).refine(isNoteAttachmentUri)),
          contentBase64: z.string().regex(BASE64_PATTERN),
        }),
      )
      .default([]),
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
  attachments: BackupAttachment[] = [],
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
      attachments,
    },
  };
}

/**
 * Reads note attachments from app-owned storage for inclusion in a backup.
 * Files outside Documents are omitted; unreadable owned files fail the export
 * rather than silently producing a backup that appears complete.
 */
export async function collectNoteAttachments(
  notes: Note[],
): Promise<BackupAttachment[]> {
  const files = new Map<string, { uris: Set<string>; contentBase64: string }>();
  for (const note of notes) {
    for (const uri of attachmentUris(note)) {
      const path = resolveOwnedAttachmentPath(uri);
      if (!path) {
        continue;
      }
      const existing = files.get(path);
      if (existing) {
        existing.uris.add(uri);
      } else {
        files.set(path, {
          uris: new Set([uri]),
          contentBase64: await RNFS.readFile(path, 'base64'),
        });
      }
    }
  }
  return [...files.values()].map(({ uris, contentBase64 }) => ({
    uris: [...uris],
    contentBase64,
  }));
}

/**
 * Materializes archived attachment contents in this install's Documents
 * directory and updates the restored notes to point at the new local files.
 */
export async function restoreNoteAttachments(
  notes: Note[],
  attachments: BackupAttachment[],
): Promise<{ notes: Note[]; createdUris: string[] }> {
  const restoredUris = new Map<string, string>();
  const referencedUris = new Set(notes.flatMap(attachmentUris));
  const createdUris: string[] = [];
  try {
    for (const attachment of attachments) {
      const pendingUris = attachment.uris.filter(
        (uri) =>
          referencedUris.has(uri) &&
          isNoteAttachmentUri(uri) &&
          !restoredUris.has(uri),
      );
      if (pendingUris.length === 0) {
        continue;
      }
      const firstUri = pendingUris[0].split(/[?#]/, 1)[0];
      const filename = firstUri.split('/').pop() ?? '';
      const extension = filename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
      const path = `${RNFS.DocumentDirectoryPath}/note-attachment-${uuid()}${extension}`;
      const localUri = `file://${path}`;
      createdUris.push(localUri);
      await RNFS.writeFile(path, attachment.contentBase64, 'base64');
      for (const uri of pendingUris) {
        restoredUris.set(uri, localUri);
      }
    }
  } catch (error) {
    await deleteAttachmentFiles(createdUris);
    throw error;
  }
  return {
    notes: notes.map((note) => ({
      ...note,
      photoUris: (Array.isArray(note.photoUris) ? note.photoUris : [])
        .filter((uri): uri is string => typeof uri === 'string')
        .map((uri) => restoredUris.get(uri) ?? uri),
      audioUri:
        typeof note.audioUri === 'string' && note.audioUri
          ? (restoredUris.get(note.audioUri) ?? note.audioUri)
          : undefined,
    })),
    createdUris,
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
 * Deletes exported backup files from previous app sessions.
 *
 * A backup is plain JSON holding notes, emergency contacts and GPS trails.
 * `exportBackup` has to write one to disk so the share sheet can hand it
 * over. Files shared during the current session are kept because a recipient
 * may still be copying them after the share sheet closes.
 *
 * Never throws: failing to tidy up must not block an export or startup.
 */
export async function purgeExportedBackups(): Promise<void> {
  try {
    const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
    await Promise.all(
      files
        .filter(
          (f) =>
            f.name.startsWith(BACKUP_FILE_PREFIX) &&
            f.name.endsWith('.json') &&
            !f.isDirectory() &&
            !currentSessionExportPaths.has(f.path),
        )
        .map((f) => RNFS.unlink(f.path).catch(() => undefined)),
    );
  } catch {
    // The cache directory may not exist yet; there is nothing to remove.
  }
}

/**
 * Exports a backup by writing it to a unique temporary file and opening
 * the native share sheet so the user can save it to Files, email it, etc.
 *
 * Android uses the native share library because React Native's Share API
 * reports the chooser as shared even when it is dismissed.
 *
 * Dismissed exports are removed immediately. Confirmed and unconfirmed
 * handoffs are retained until the next app session because a share target
 * may still be copying the file after the sheet has closed.
 */
export async function exportBackup(
  backupData: BackupData,
): Promise<BackupExportResult> {
  await purgeExportedBackups();
  const filename = `${BACKUP_FILE_PREFIX}${backupData.backupDate}-${uuid()}.json`;
  const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;
  const json = JSON.stringify(backupData, null, 2);
  await RNFS.writeFile(destPath, json, 'utf8');
  currentSessionExportPaths.add(destPath);

  const discardExport = async () => {
    currentSessionExportPaths.delete(destPath);
    await RNFS.unlink(destPath).catch(() => undefined);
  };

  try {
    if (Platform.OS === 'android') {
      const NativeShare = require('react-native-share')
        .default as typeof import('react-native-share').default;
      const result = await NativeShare.open({
        url: `file://${destPath}`,
        title: filename,
        type: 'application/json',
        failOnCancel: false,
      });
      if (result.success) {
        return 'shared';
      }
      if (result.dismissedAction) {
        await discardExport();
        return 'dismissed';
      }
      return 'unconfirmed';
    }

    const result = await Share.share({
      url: `file://${destPath}`,
      title: filename,
    });
    if (result.action === Share.dismissedAction) {
      await discardExport();
      return 'dismissed';
    }
    if (result.action === Share.sharedAction) {
      return 'shared';
    }
    return 'unconfirmed';
  } catch (error) {
    await discardExport();
    throw error;
  }
}
