/**
 * The bookkeeping behind the Pantry scan screen, kept free of React and the
 * camera so it can be tested on its own.
 *
 * The camera reports a code on every frame it stays in view, so a can held
 * still would otherwise be counted thirty times a second. {@link ScanGate}
 * counts a code once, then again only after it has been out of view for a
 * moment: lifting the next can of the same product counts, holding one
 * doesn't.
 */

/** How long a code must be out of view before it counts again, in ms. */
export const RESCAN_GAP_MS = 800;

/** Decides which camera reports are new scans. */
export class ScanGate {
  private readonly lastSeen = new Map<string, number>();

  constructor(private readonly gapMs: number = RESCAN_GAP_MS) {}

  /**
   * Call for every code the camera reports. Returns `true` when the code
   * should count as a new scan: first sight, or first sight after it was
   * out of view for longer than the gap.
   */
  accept(code: string, now: number): boolean {
    const last = this.lastSeen.get(code);
    this.lastSeen.set(code, now);
    return last === undefined || now - last > this.gapMs;
  }
}

/** One product scanned during this visit to the scan screen. */
export interface ScanEntry {
  /** Canonical barcode (see `utils/barcode`). */
  barcode: string;
  /**
   * For a product already in the pantry: units added this session. For an
   * unknown code: how many times it was scanned, offered as the quantity
   * when the user adds it.
   */
  count: number;
  /**
   * The pantry item the units went to. Unset for a code that was unknown
   * when scanned; once the user adds it, the screen finds the new item by
   * barcode.
   */
  itemId?: string;
  lastScannedAt: number;
}

/**
 * The session with one more scan of `barcode`, most recent first. `itemId`
 * is the item that received the unit, or `undefined` for an unknown code.
 */
export function recordScan(
  entries: ScanEntry[],
  barcode: string,
  itemId: string | undefined,
  now: number,
): ScanEntry[] {
  const existing = entries.find((entry) => entry.barcode === barcode);
  const others = entries.filter((entry) => entry.barcode !== barcode);
  return [
    {
      barcode,
      count: (existing?.count ?? 0) + 1,
      itemId: itemId ?? existing?.itemId,
      lastScannedAt: now,
    },
    ...others,
  ];
}

/** The session with one scan of `barcode` taken back; drops it at zero. */
export function undoScan(entries: ScanEntry[], barcode: string): ScanEntry[] {
  return entries.flatMap((entry) => {
    if (entry.barcode !== barcode) return [entry];
    return entry.count > 1 ? [{ ...entry, count: entry.count - 1 }] : [];
  });
}
