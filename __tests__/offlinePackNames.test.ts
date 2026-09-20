import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPackNameOverride,
  getPackDisplayName,
  loadPackNameOverrides,
  setPackNameOverride,
  transferPackNameOverride,
} from '../src/utils/offlinePackNames';

const pack = {
  id: 'pack-1',
  metadata: {
    name: 'Area Download 9/20/2026',
    createdAt: '2026-09-20T00:00:00.000Z',
    radiusMiles: 10,
    centerLng: -115.13,
    centerLat: 36.17,
  },
};

describe('offlinePackNames', () => {
  let storage: Record<string, string>;

  beforeEach(async () => {
    jest.clearAllMocks();
    storage = {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => (key in storage ? storage[key] : null),
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        storage[key] = value;
      },
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        delete storage[key];
      },
    );
  });

  it('uses overrides before metadata names', () => {
    const name = getPackDisplayName(pack, { 'pack-1': 'Near Red Rock Canyon' });
    expect(name).toBe('Near Red Rock Canyon');
  });

  it('persists and loads name overrides', async () => {
    await setPackNameOverride('pack-1', 'Near Red Rock Canyon');

    await expect(loadPackNameOverrides()).resolves.toEqual({
      'pack-1': 'Near Red Rock Canyon',
    });
  });

  it('clears overrides on delete', async () => {
    await setPackNameOverride('pack-1', 'Near Red Rock Canyon');
    await clearPackNameOverride('pack-1');

    await expect(loadPackNameOverrides()).resolves.toEqual({});
  });

  it('carries overrides across refresh replacement ids', async () => {
    await setPackNameOverride('old-pack', 'Near Red Rock Canyon');
    await transferPackNameOverride('old-pack', 'new-pack');

    await expect(loadPackNameOverrides()).resolves.toEqual({
      'new-pack': 'Near Red Rock Canyon',
    });
  });

  it('survives reload from AsyncStorage', async () => {
    await AsyncStorage.setItem(
      '@offline/pack_names',
      JSON.stringify({ 'pack-1': 'Near Red Rock Canyon' }),
    );

    await expect(loadPackNameOverrides()).resolves.toEqual({
      'pack-1': 'Near Red Rock Canyon',
    });
  });
});
