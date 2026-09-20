import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineMapPack } from '../navigation/services/OfflineMapService';

const PACK_NAME_OVERRIDES_KEY = '@offline/pack_names';

type PackNameOverrides = Record<string, string>;
let writeQueue: Promise<void> = Promise.resolve();

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

function enqueueWrite(
  updater: (overrides: PackNameOverrides) => void,
): Promise<void> {
  const operation = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const next = await readOverrides();
      updater(next);
      await writeOverrides(next);
    });
  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
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
  await enqueueWrite((next) => {
    if (!trimmed) {
      delete next[packId];
    } else {
      next[packId] = trimmed;
    }
  });
}

export async function clearPackNameOverride(packId: string): Promise<void> {
  await enqueueWrite((next) => {
    if (!(packId in next)) {
      return;
    }
    delete next[packId];
  });
}

export async function transferPackNameOverride(
  fromPackId: string,
  toPackId: string,
): Promise<void> {
  await enqueueWrite((next) => {
    if (!next[fromPackId]) {
      return;
    }
    next[toPackId] = next[fromPackId];
    delete next[fromPackId];
  });
}
