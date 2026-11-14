/**
 * @format
 */

import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import {
  BACKUP_VERSION,
  BackupData,
  exportBackup,
  purgeExportedBackups,
} from '../src/utils/backupService';

const BACKUP: BackupData = {
  version: BACKUP_VERSION,
  backupDate: '2026-11-14',
  createdAt: 1794700800000,
  data: {
    notes: [],
    noteCategories: [],
    checklists: [],
    checklistItems: [],
    inventoryItems: [],
    inventoryCategories: [],
    pantryItems: [],
    pantryCategories: [],
    bookmarks: [],
    settings: {
      fontSize: 'small',
      themeMode: 'system',
      noteSortOrder: 'newest-oldest',
    },
    waypoints: [],
    tracks: [],
    emergencyContacts: [],
    rallyPoints: [],
    communicationPlan: null,
    customRepeaters: [],
  },
};

const EXPORT_PATH = '/tmp/cache/coldboot-backup-2026-11-14.json';

function cacheEntry(name: string, directory = false) {
  return {
    name,
    path: `/tmp/cache/${name}`,
    isDirectory: () => directory,
  };
}

const readDir = RNFS.readDir as jest.Mock;
const unlink = RNFS.unlink as jest.Mock;
const writeFile = RNFS.writeFile as jest.Mock;

describe('backup export', () => {
  let share: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    readDir.mockResolvedValue([]);
    unlink.mockResolvedValue(undefined);
    share = jest.spyOn(Share, 'share');
  });

  afterEach(() => {
    share.mockRestore();
  });

  describe('purgeExportedBackups', () => {
    it('deletes backup files from the cache and nothing else', async () => {
      readDir.mockResolvedValue([
        cacheEntry('coldboot-backup-2026-10-01.json'),
        cacheEntry('coldboot-backup-2026-11-01.json'),
        cacheEntry('decibel-meter.m4a'),
        cacheEntry('coldboot-backup-notes.txt'),
        cacheEntry('coldboot-backup-folder.json', true),
      ]);

      await purgeExportedBackups();

      expect(readDir).toHaveBeenCalledWith('/tmp/cache');
      expect(unlink.mock.calls.map(([path]) => path)).toEqual([
        '/tmp/cache/coldboot-backup-2026-10-01.json',
        '/tmp/cache/coldboot-backup-2026-11-01.json',
      ]);
    });

    it('does not throw when the cache cannot be read or a file is stuck', async () => {
      readDir.mockRejectedValueOnce(new Error('no such directory'));
      await expect(purgeExportedBackups()).resolves.toBeUndefined();

      readDir.mockResolvedValue([
        cacheEntry('coldboot-backup-2026-10-01.json'),
      ]);
      unlink.mockRejectedValueOnce(new Error('busy'));
      await expect(purgeExportedBackups()).resolves.toBeUndefined();
    });
  });

  describe('exportBackup', () => {
    it('clears earlier exports, writes the file and reports a completed share', async () => {
      readDir.mockResolvedValue([
        cacheEntry('coldboot-backup-2026-10-01.json'),
      ]);
      share.mockResolvedValue({ action: Share.sharedAction });

      await expect(exportBackup(BACKUP)).resolves.toBe(true);

      expect(unlink).toHaveBeenCalledWith(
        '/tmp/cache/coldboot-backup-2026-10-01.json',
      );
      expect(writeFile).toHaveBeenCalledWith(
        EXPORT_PATH,
        expect.any(String),
        'utf8',
      );
      expect(share).toHaveBeenCalledWith({
        url: `file://${EXPORT_PATH}`,
        title: 'coldboot-backup-2026-11-14.json',
      });
      // Left for the next purge: a share target may still be copying it.
      expect(unlink).not.toHaveBeenCalledWith(EXPORT_PATH);
    });

    it('reports a dismissed share sheet and removes the file at once', async () => {
      share.mockResolvedValue({ action: Share.dismissedAction });

      await expect(exportBackup(BACKUP)).resolves.toBe(false);

      expect(unlink).toHaveBeenCalledWith(EXPORT_PATH);
    });

    it('removes the file and rethrows when sharing fails', async () => {
      share.mockRejectedValue(new Error('share unavailable'));

      await expect(exportBackup(BACKUP)).rejects.toThrow('share unavailable');

      expect(unlink).toHaveBeenCalledWith(EXPORT_PATH);
    });
  });
});
