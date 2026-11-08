import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const STORAGE_KEY = '@reference/last_read';

const LastReadSchema = z.object({
  id: z.string().min(1),
  openedAt: z.number(),
});

export type LastRead = z.infer<typeof LastReadSchema>;

/**
 * Remembers the reference entry the user opened last, so the Reference
 * hero can offer to continue it. Failures are swallowed: this is a
 * convenience, never worth an error on screen.
 */
export async function recordLastRead(
  id: string,
  openedAt: number = Date.now(),
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id, openedAt }));
  } catch {
    // intentionally ignored: see above
  }
}

/** The last entry opened, or null when there is none or it can't be read. */
export async function getLastRead(): Promise<LastRead | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = LastReadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
