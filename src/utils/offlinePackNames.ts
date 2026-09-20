import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineMapPack } from '../navigation/services/OfflineMapService';

const PACK_NAME_OVERRIDES_KEY = '@offline/pack_names';

type PackNameOverrides = Record<string, string>;

async function readOverrides(): Promise<PackNameOverrides> {
  try {
    const raw = await AsyncStorage.getItem(PACK_NAME_OVERRIDES_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed as PackNameOverrides;
  } catch {
    return {};
  }
}

async function writeOverrides(overrides: PackNameOverrides): Promise<void> {
  await AsyncStorage.setItem(
    PACK_NAME_OVERRIDES_KEY,
    JSON.stringify(overrides),
  );
}

export function getPackDisplayName(
  pack: Pick<OfflineMapPack, 'id' | 'metadata'>,
  overrides: PackNameOverrides,
): string {
  return overrides[pack.id] ?? pack.metadata.name;
}

export async function loadPackNameOverrides(): Promise<PackNameOverrides> {
  return readOverrides();
}

export async function setPackNameOverride(
  packId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  const next = await readOverrides();

  if (!trimmed) {
    delete next[packId];
  } else {
    next[packId] = trimmed;
  }

  await writeOverrides(next);
}

export async function clearPackNameOverride(packId: string): Promise<void> {
  const next = await readOverrides();
  if (!(packId in next)) {
    return;
  }
  delete next[packId];
  await writeOverrides(next);
}

export async function transferPackNameOverride(
  fromPackId: string,
  toPackId: string,
): Promise<void> {
  const next = await readOverrides();
  if (!next[fromPackId]) {
    return;
  }
  next[toPackId] = next[fromPackId];
  delete next[fromPackId];
  await writeOverrides(next);
}
