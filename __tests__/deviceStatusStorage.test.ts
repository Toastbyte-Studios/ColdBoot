import RNFS from 'react-native-fs';
import {
  freeSpaceTone,
  mapAreasThatFit,
  measurePhotos,
  measureRecordings,
} from '../src/screens/DeviceStatus/appStorage';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const file = (name: string, size: number) => ({
  name,
  size,
  path: `${RNFS.DocumentDirectoryPath}/${name}`,
  isFile: () => true,
  isDirectory: () => false,
});

describe('measurePhotos', () => {
  it('counts only files photoPicker saved', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValueOnce([
      file('photo_1_a.jpg', 2 * MB),
      file('photo_2_b.heic', 3 * MB),
      file('coldboot-backup-2026.json', 10 * MB),
      { ...file('photo_dir', 0), isFile: () => false, isDirectory: () => true },
    ]);
    expect(await measurePhotos()).toEqual({ bytes: 5 * MB, count: 2 });
  });

  it('reads as empty if the directory cannot be listed', async () => {
    (RNFS.readDir as jest.Mock).mockRejectedValueOnce(new Error('denied'));
    expect(await measurePhotos()).toEqual({ bytes: 0, count: 0 });
  });
});

describe('measureRecordings', () => {
  it('sums existing recordings and skips missing files', async () => {
    (RNFS.stat as jest.Mock).mockImplementation((path: string) =>
      path.includes('gone')
        ? Promise.reject(new Error('ENOENT'))
        : Promise.resolve({ size: 1 * MB, isDirectory: () => false }),
    );
    const usage = await measureRecordings([
      'file:///tmp/cache/a.m4a',
      '/tmp/cache/b.m4a',
      'file:///tmp/cache/gone.m4a',
    ]);
    expect(usage).toEqual({ bytes: 2 * MB, count: 2 });
    expect(RNFS.stat).toHaveBeenCalledWith('/tmp/cache/a.m4a');
  });
});

describe('mapAreasThatFit', () => {
  it('estimates from the average area, keeping a quarter free', () => {
    // 3 areas of 100 MB on average; 4 GB free, 3 GB usable.
    expect(mapAreasThatFit(4 * GB, 300 * MB, 3)).toBe(30);
  });

  it('has nothing to judge by without downloaded areas', () => {
    expect(mapAreasThatFit(4 * GB, 0, 0)).toBeNull();
    expect(mapAreasThatFit(null, 300 * MB, 3)).toBeNull();
  });
});

describe('freeSpaceTone', () => {
  it('bands free space', () => {
    expect(freeSpaceTone(20 * GB)).toBe('good');
    expect(freeSpaceTone(3 * GB)).toBe('fair');
    expect(freeSpaceTone(500 * MB)).toBe('poor');
    expect(freeSpaceTone(null)).toBe('neutral');
  });
});
