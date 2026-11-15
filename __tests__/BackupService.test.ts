/**
 * @format
 */

import RNFS from 'react-native-fs';
import {
  BACKUP_VERSION,
  BackupData,
  collectNoteAttachments,
  createBackupData,
  createBackupPreview,
  restoreNoteAttachments,
  validateBackup,
} from '../src/utils/backupService';

const DOCS = '/tmp/documents';

const SAMPLE_BACKUP: BackupData = {
  version: BACKUP_VERSION,
  backupDate: '2026-03-03',
  createdAt: 1741046400000,
  data: {
    notes: [
      {
        id: 'note-1',
        createdAt: 1741000000000,
        category: 'General',
        type: 'text',
        title: 'Test Note',
        text: 'Hello',
        photoUris: [],
      },
    ],
    noteCategories: ['General', 'Work'],
    checklists: [
      {
        id: 'cl-1',
        name: 'Bug-out bag',
        createdAt: 1740000000000,
        isDefault: true,
      },
    ],
    checklistItems: [
      {
        id: 'cli-1',
        checklistId: 'cl-1',
        text: 'Water',
        checked: false,
        order: 0,
      },
    ],
    inventoryItems: [
      {
        id: 'inv-1',
        name: 'Flashlight',
        category: 'Tools',
        quantity: 2,
        createdAt: 1740000000000,
        updatedAt: 1740000000000,
      },
    ],
    inventoryCategories: ['Tools', 'Food'],
    pantryItems: [
      {
        id: 'pan-1',
        name: 'Rice',
        category: 'Grains',
        quantity: 5,
        unit: 'lbs',
        createdAt: 1740000000000,
        updatedAt: 1740000000000,
      },
    ],
    pantryCategories: ['Grains', 'Canned'],
    bookmarks: [
      {
        id: 'bm-1',
        title: 'First Aid',
        category: 'Health',
        createdAt: 1740000000000,
      },
    ],
    settings: {
      fontSize: 'medium',
      themeMode: 'dark',
      noteSortOrder: 'newest-oldest',
      measurementSystem: 'metric',
      shortcuts: ['core_flashlight', 'nav_map', 'core_voice_log'],
    },
    waypoints: [
      {
        id: 'wp-1',
        name: 'Home Base',
        latitude: 35.123,
        longitude: -115.456,
        createdAt: '2026-03-03T12:00:00.000Z',
      },
    ],
    tracks: [
      {
        id: 'track-1',
        name: 'Supply Run',
        createdAt: '2026-03-03T13:00:00.000Z',
        durationSeconds: 900,
        distanceMeters: 1200,
        points: [
          {
            latitude: 35.123,
            longitude: -115.456,
            altitude: null,
            timestamp: 1741046400000,
          },
        ],
      },
    ],
    emergencyContacts: [
      {
        id: 'contact-1',
        name: 'Sam',
        relationship: 'Neighbor',
        phone: '555-1111',
        notes: 'Has generator',
        createdAt: 1741046400000,
        updatedAt: 1741046400000,
      },
    ],
    rallyPoints: [
      {
        id: 'rally-1',
        name: 'Creek Trailhead',
        description: 'Meet here if evac route A is blocked',
        coordinates: '35.123,-115.456',
        createdAt: 1741046400000,
        updatedAt: 1741046400000,
      },
    ],
    communicationPlan: {
      whoCallsWhom: 'Sam calls Alex',
      ifPhonesDown: 'Use channel 3',
      outOfAreaContact: 'Pat',
      checkInSchedule: '08:00 and 20:00',
      updatedAt: 1741046400000,
    },
    customRepeaters: [
      {
        id: 'custom-1',
        callSign: 'KTOAST',
        frequency: '146.520',
        offset: '',
        tone: '88.5',
        mode: 'FM',
        city: 'Baker',
        state: 'CA',
        lat: 35.266,
        lng: -116.073,
        operationalStatus: 'On-air',
        use: '',
        notes: 'Local simplex fallback',
        lastEdited: '2026-03-03',
        distance: 0,
        emcomm: 'Yes',
        isCustom: true,
      },
    ],
    attachments: [],
  },
};

describe('BackupService', () => {
  beforeEach(() => {
    (RNFS.readFile as jest.Mock).mockReset();
    (RNFS.readFile as jest.Mock).mockResolvedValue('Y29udGVudA==');
    (RNFS.writeFile as jest.Mock).mockReset();
    (RNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('validateBackup', () => {
    it('should return true for a valid backup object', () => {
      expect(validateBackup(SAMPLE_BACKUP)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateBackup(null)).toBe(false);
    });

    it('should return false for a non-object value', () => {
      expect(validateBackup('string')).toBe(false);
      expect(validateBackup(42)).toBe(false);
      expect(validateBackup([])).toBe(false);
    });

    it('should return false when version is missing', () => {
      const noVersion = {
        ...(SAMPLE_BACKUP as unknown as Record<string, unknown>),
      };
      delete noVersion.version;
      expect(validateBackup(noVersion)).toBe(false);
    });

    it('should return false when version is unsupported', () => {
      const bad = { ...SAMPLE_BACKUP, version: '9.9' };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should accept a v1.0 backup and backfill v2 fields', () => {
      const legacyBackup = {
        ...SAMPLE_BACKUP,
        version: '1.0',
        data: {
          ...SAMPLE_BACKUP.data,
        },
      };

      delete (legacyBackup.data as Partial<typeof legacyBackup.data>).waypoints;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>).tracks;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>)
        .emergencyContacts;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>)
        .rallyPoints;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>)
        .communicationPlan;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>)
        .customRepeaters;
      delete (legacyBackup.data as Partial<typeof legacyBackup.data>)
        .attachments;

      expect(validateBackup(legacyBackup)).toBe(true);
      expect(legacyBackup.data.waypoints).toEqual([]);
      expect(legacyBackup.data.tracks).toEqual([]);
      expect(legacyBackup.data.emergencyContacts).toEqual([]);
      expect(legacyBackup.data.rallyPoints).toEqual([]);
      expect(legacyBackup.data.communicationPlan).toBeNull();
      expect(legacyBackup.data.customRepeaters).toEqual([]);
      expect(legacyBackup.data.attachments).toEqual([]);
    });

    it('should accept a backup without shortcuts in settings', () => {
      const legacySettings = {
        ...SAMPLE_BACKUP,
        data: {
          ...SAMPLE_BACKUP.data,
          settings: {
            ...SAMPLE_BACKUP.data.settings,
          },
        },
      };

      delete (legacySettings.data.settings as { shortcuts?: string[] })
        .shortcuts;

      expect(validateBackup(legacySettings)).toBe(true);
      expect(legacySettings.data.settings.shortcuts).toBeUndefined();
    });

    it('should return false when backupDate is missing', () => {
      const bad = { ...SAMPLE_BACKUP, backupDate: undefined };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should return false when createdAt is not a number', () => {
      const bad = { ...SAMPLE_BACKUP, createdAt: '2026-03-03' };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should return false when data is missing', () => {
      const noData = {
        ...(SAMPLE_BACKUP as unknown as Record<string, unknown>),
      };
      delete noData.data;
      expect(validateBackup(noData)).toBe(false);
    });

    it('should return false when notes array is missing', () => {
      const bad = {
        ...SAMPLE_BACKUP,
        data: { ...SAMPLE_BACKUP.data, notes: undefined },
      };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should return false when inventoryItems is not an array', () => {
      const bad = {
        ...SAMPLE_BACKUP,
        data: { ...SAMPLE_BACKUP.data, inventoryItems: null },
      };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should return false when settings is missing', () => {
      const bad = {
        ...SAMPLE_BACKUP,
        data: { ...SAMPLE_BACKUP.data, settings: undefined },
      };
      expect(validateBackup(bad)).toBe(false);
    });

    it('should reject malformed attachment contents', () => {
      const bad = {
        ...SAMPLE_BACKUP,
        data: {
          ...SAMPLE_BACKUP.data,
          attachments: [
            {
              uris: [`file://${DOCS}/photo_123_abc123.jpg`],
              contentBase64: 'bad',
            },
          ],
        },
      };
      expect(validateBackup(bad)).toBe(false);
    });
  });

  describe('createBackupPreview', () => {
    it('should return correct item counts', () => {
      const preview = createBackupPreview(SAMPLE_BACKUP);
      expect(preview.backupDate).toBe('2026-03-03');
      expect(preview.createdAt).toBe(1741046400000);
      expect(preview.noteCount).toBe(1);
      expect(preview.checklistCount).toBe(1);
      expect(preview.inventoryItemCount).toBe(1);
      expect(preview.pantryItemCount).toBe(1);
      expect(preview.bookmarkCount).toBe(1);
      expect(preview.waypointCount).toBe(1);
      expect(preview.trackCount).toBe(1);
      expect(preview.emergencyContactCount).toBe(1);
      expect(preview.rallyPointCount).toBe(1);
      expect(preview.communicationPlanCount).toBe(1);
      expect(preview.customRepeaterCount).toBe(1);
    });

    it('should return zero counts for empty data', () => {
      const emptyBackup: BackupData = {
        ...SAMPLE_BACKUP,
        data: {
          ...SAMPLE_BACKUP.data,
          notes: [],
          checklists: [],
          checklistItems: [],
          inventoryItems: [],
          pantryItems: [],
          bookmarks: [],
          waypoints: [],
          tracks: [],
          emergencyContacts: [],
          rallyPoints: [],
          communicationPlan: null,
          customRepeaters: [],
        },
      };
      const preview = createBackupPreview(emptyBackup);
      expect(preview.noteCount).toBe(0);
      expect(preview.checklistCount).toBe(0);
      expect(preview.inventoryItemCount).toBe(0);
      expect(preview.pantryItemCount).toBe(0);
      expect(preview.bookmarkCount).toBe(0);
      expect(preview.waypointCount).toBe(0);
      expect(preview.trackCount).toBe(0);
      expect(preview.emergencyContactCount).toBe(0);
      expect(preview.rallyPointCount).toBe(0);
      expect(preview.communicationPlanCount).toBe(0);
      expect(preview.customRepeaterCount).toBe(0);
    });
  });

  describe('createBackupData', () => {
    it('should produce a valid backup object', () => {
      const backup = createBackupData(
        SAMPLE_BACKUP.data.notes,
        SAMPLE_BACKUP.data.noteCategories,
        SAMPLE_BACKUP.data.checklists,
        SAMPLE_BACKUP.data.checklistItems,
        SAMPLE_BACKUP.data.inventoryItems,
        SAMPLE_BACKUP.data.inventoryCategories,
        SAMPLE_BACKUP.data.pantryItems,
        SAMPLE_BACKUP.data.pantryCategories,
        SAMPLE_BACKUP.data.bookmarks,
        SAMPLE_BACKUP.data.settings,
        SAMPLE_BACKUP.data.waypoints,
        SAMPLE_BACKUP.data.tracks,
        SAMPLE_BACKUP.data.emergencyContacts,
        SAMPLE_BACKUP.data.rallyPoints,
        SAMPLE_BACKUP.data.communicationPlan,
        SAMPLE_BACKUP.data.customRepeaters,
      );

      expect(validateBackup(backup)).toBe(true);
      expect(backup.version).toBe(BACKUP_VERSION);
      expect(typeof backup.backupDate).toBe('string');
      expect(backup.backupDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof backup.createdAt).toBe('number');
    });

    it('should include all provided data', () => {
      const backup = createBackupData(
        SAMPLE_BACKUP.data.notes,
        SAMPLE_BACKUP.data.noteCategories,
        SAMPLE_BACKUP.data.checklists,
        SAMPLE_BACKUP.data.checklistItems,
        SAMPLE_BACKUP.data.inventoryItems,
        SAMPLE_BACKUP.data.inventoryCategories,
        SAMPLE_BACKUP.data.pantryItems,
        SAMPLE_BACKUP.data.pantryCategories,
        SAMPLE_BACKUP.data.bookmarks,
        SAMPLE_BACKUP.data.settings,
        SAMPLE_BACKUP.data.waypoints,
        SAMPLE_BACKUP.data.tracks,
        SAMPLE_BACKUP.data.emergencyContacts,
        SAMPLE_BACKUP.data.rallyPoints,
        SAMPLE_BACKUP.data.communicationPlan,
        SAMPLE_BACKUP.data.customRepeaters,
      );

      expect(backup.data.notes).toHaveLength(1);
      expect(backup.data.noteCategories).toEqual(['General', 'Work']);
      expect(backup.data.inventoryItems).toHaveLength(1);
      expect(backup.data.pantryItems).toHaveLength(1);
      expect(backup.data.bookmarks).toHaveLength(1);
      expect(backup.data.waypoints).toHaveLength(1);
      expect(backup.data.tracks).toHaveLength(1);
      expect(backup.data.emergencyContacts).toHaveLength(1);
      expect(backup.data.rallyPoints).toHaveLength(1);
      expect(backup.data.communicationPlan?.whoCallsWhom).toBe(
        'Sam calls Alex',
      );
      expect(backup.data.customRepeaters).toHaveLength(1);
      expect(backup.data.settings.fontSize).toBe('medium');
      expect(backup.data.settings.measurementSystem).toBe('metric');
      expect(backup.data.settings.shortcuts).toEqual([
        'core_flashlight',
        'nav_map',
        'core_voice_log',
      ]);
    });
  });

  describe('note attachment backup', () => {
    it('includes the contents of owned attachments once per local file', async () => {
      const photoUri = `file://${DOCS}/photo_123_abc123.jpg`;
      const backupAttachments = await collectNoteAttachments([
        {
          ...SAMPLE_BACKUP.data.notes[0],
          photoUris: [
            photoUri,
            `${DOCS}/photo_123_abc123.jpg`,
            `${DOCS}/coldboot-backup-2026-11-15.json`,
          ],
          audioUri: 'content://external/audio',
        },
      ]);

      expect(backupAttachments).toEqual([
        {
          uris: [photoUri, `${DOCS}/photo_123_abc123.jpg`],
          contentBase64: 'Y29udGVudA==',
        },
      ]);
      expect(RNFS.readFile).toHaveBeenCalledTimes(1);
      expect(RNFS.readFile).toHaveBeenCalledWith(
        `${DOCS}/photo_123_abc123.jpg`,
        'base64',
      );
    });

    it('does not map attachment contents from unverified imported paths', async () => {
      const backupUri = `${DOCS}/coldboot-backup-2026-11-15.json`;
      const { notes, createdUris } = await restoreNoteAttachments(
        [
          {
            ...SAMPLE_BACKUP.data.notes[0],
            photoUris: [backupUri],
          },
        ],
        [{ uris: [backupUri], contentBase64: 'YXR0YWNobWVudA==' }],
      );

      expect(createdUris).toEqual([]);
      expect(notes[0].photoUris).toEqual([backupUri]);
      expect(RNFS.writeFile).not.toHaveBeenCalled();
    });

    it('restores attachment contents to owned paths and rewrites note URIs', async () => {
      const oldPhotoUri =
        'file:///old/container/Documents/photo_123_abc123.jpg';
      const oldAudioUri = `${DOCS}/voice-log_123e4567-e89b-42d3-a456-426614174000.m4a`;
      const { notes, createdUris } = await restoreNoteAttachments(
        [
          {
            ...SAMPLE_BACKUP.data.notes[0],
            photoUris: [oldPhotoUri],
            audioUri: oldAudioUri,
          },
        ],
        [
          { uris: [oldPhotoUri], contentBase64: 'cGhvdG8=' },
          { uris: [oldAudioUri], contentBase64: 'YXVkaW8=' },
        ],
      );

      expect(createdUris).toHaveLength(2);
      expect(notes[0].photoUris).toEqual([createdUris[0]]);
      expect(notes[0].audioUri).toBe(createdUris[1]);
      expect(createdUris[0]).toMatch(
        new RegExp(`^file://${DOCS}/note-attachment-.+\\.jpg$`),
      );
      expect(createdUris[1]).toMatch(
        new RegExp(`^file://${DOCS}/note-attachment-.+\\.m4a$`),
      );
      expect(RNFS.writeFile).toHaveBeenNthCalledWith(
        1,
        createdUris[0].slice('file://'.length),
        'cGhvdG8=',
        'base64',
      );
      expect(RNFS.writeFile).toHaveBeenNthCalledWith(
        2,
        createdUris[1].slice('file://'.length),
        'YXVkaW8=',
        'base64',
      );
    });
  });
});
