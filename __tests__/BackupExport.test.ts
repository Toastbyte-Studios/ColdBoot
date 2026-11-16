/**
 * @format
 */

import { Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import NativeShare from 'react-native-share';
import {
  BACKUP_VERSION,
  BackupData,
  exportBackup,
  purgeExportedBackups,
} from '../src/utils/backupService';

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

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
    attachments: [],
  },
};

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
const nativeShareOpen = NativeShare.open as jest.Mock;

describe('backup export', () => {
  let share: jest.SpyInstance;
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    readDir.mockResolvedValue([]);
    unlink.mockResolvedValue(undefined);
    share = jest.spyOn(Share, 'share');
  });

  afterEach(() => {
    share.mockRestore();
    Platform.OS = originalPlatformOS;
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
    it('clears stale exports and reports a completed iOS share', async () => {
      readDir.mockResolvedValue([
        cacheEntry('coldboot-backup-2026-10-01.json'),
      ]);
      share.mockResolvedValue({ action: Share.sharedAction });

      await expect(exportBackup(BACKUP)).resolves.toBe('shared');

      expect(unlink).toHaveBeenCalledWith(
        '/tmp/cache/coldboot-backup-2026-10-01.json',
      );
      const exportPath = writeFile.mock.calls[0][0];
      expect(exportPath).toMatch(
        /^\/tmp\/cache\/coldboot-backup-2026-11-14-[\w-]+\.json$/,
      );
      expect(writeFile).toHaveBeenCalledWith(
        exportPath,
        expect.any(String),
        'utf8',
      );
      expect(share).toHaveBeenCalledWith({
        url: `file://${exportPath}`,
        title: expect.stringMatching(
          /^coldboot-backup-2026-11-14-[\w-]+\.json$/,
        ),
      });
      expect(unlink).not.toHaveBeenCalledWith(exportPath);
      expect(nativeShareOpen).not.toHaveBeenCalled();
    });

    it('reports a dismissed share sheet and removes the file at once', async () => {
      share.mockResolvedValue({ action: Share.dismissedAction });

      await expect(exportBackup(BACKUP)).resolves.toBe('dismissed');

      expect(unlink).toHaveBeenCalledWith(writeFile.mock.calls[0][0]);
    });

    it('removes the file and rethrows when sharing fails', async () => {
      share.mockRejectedValue(new Error('share unavailable'));

      await expect(exportBackup(BACKUP)).rejects.toThrow('share unavailable');

      expect(unlink).toHaveBeenCalledWith(writeFile.mock.calls[0][0]);
    });

    it('preserves earlier exports while a share target may still be copying', async () => {
      const writtenPaths: string[] = [];
      readDir.mockImplementation(async () =>
        writtenPaths.map((path) =>
          cacheEntry(path.substring(path.lastIndexOf('/') + 1)),
        ),
      );
      writeFile.mockImplementation(async (path: string) => {
        writtenPaths.push(path);
      });

      let finishFirstShare!: (result: { action: string }) => void;
      const firstShare = new Promise<{ action: string }>((resolve) => {
        finishFirstShare = resolve;
      });
      let notifyFirstShare!: () => void;
      const firstShareStarted = new Promise<void>((resolve) => {
        notifyFirstShare = resolve;
      });
      share
        .mockImplementationOnce(() => {
          notifyFirstShare();
          return firstShare;
        })
        .mockResolvedValueOnce({ action: Share.sharedAction });

      const firstExport = exportBackup(BACKUP);
      await firstShareStarted;
      const firstPath = writeFile.mock.calls[0][0];

      await expect(exportBackup(BACKUP)).resolves.toBe('shared');
      const secondPath = writeFile.mock.calls[1][0];

      expect(secondPath).not.toBe(firstPath);
      expect(unlink).not.toHaveBeenCalledWith(firstPath);

      finishFirstShare({ action: Share.sharedAction });
      await expect(firstExport).resolves.toBe('shared');
    });

    it('reports Android chooser cancellation and removes the file', async () => {
      Platform.OS = 'android';
      nativeShareOpen.mockResolvedValue({
        success: false,
        dismissedAction: true,
        message: 'User did not share',
      });

      await expect(exportBackup(BACKUP)).resolves.toBe('dismissed');

      const exportPath = writeFile.mock.calls[0][0];
      expect(nativeShareOpen).toHaveBeenCalledWith({
        url: `file://${exportPath}`,
        title: expect.any(String),
        type: 'application/json',
        failOnCancel: false,
      });
      expect(unlink).toHaveBeenCalledWith(exportPath);
      expect(share).not.toHaveBeenCalled();
    });

    it('reports an Android target selection as shared', async () => {
      Platform.OS = 'android';
      nativeShareOpen.mockResolvedValue({
        success: true,
        message: 'com.example.target',
      });

      await expect(exportBackup(BACKUP)).resolves.toBe('shared');

      expect(unlink).not.toHaveBeenCalledWith(writeFile.mock.calls[0][0]);
    });

    it('does not treat an unconfirmed Android handoff as a completed backup', async () => {
      Platform.OS = 'android';
      nativeShareOpen.mockResolvedValue({ success: false, message: '' });

      await expect(exportBackup(BACKUP)).resolves.toBe('unconfirmed');

      expect(unlink).not.toHaveBeenCalledWith(writeFile.mock.calls[0][0]);
    });
  });
});
