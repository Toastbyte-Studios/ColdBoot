/**
 * @format
 */

import {
  RESCAN_GAP_MS,
  ScanEntry,
  ScanGate,
  reconcileAddedItem,
  recordScan,
  scanEntryKey,
  undoScan,
} from '../src/screens/Pantry/scan/pantryScanSession';

describe('ScanGate', () => {
  it('counts a code the first time it is seen', () => {
    const gate = new ScanGate();
    expect(gate.accept('0036000291452', 0)).toBe(true);
  });

  it('ignores the same code while it stays in view', () => {
    const gate = new ScanGate();
    gate.accept('0036000291452', 0);
    // Reported every frame while the can is held still.
    for (let t = 33; t < 3000; t += 33) {
      expect(gate.accept('0036000291452', t)).toBe(false);
    }
  });

  it('counts the code again after it has been out of view', () => {
    const gate = new ScanGate();
    gate.accept('0036000291452', 0);
    expect(gate.accept('0036000291452', RESCAN_GAP_MS + 1)).toBe(true);
  });

  it('does not count again at exactly the gap', () => {
    const gate = new ScanGate();
    gate.accept('0036000291452', 0);
    expect(gate.accept('0036000291452', RESCAN_GAP_MS)).toBe(false);
  });

  it('tracks each code separately', () => {
    const gate = new ScanGate();
    gate.accept('0036000291452', 0);
    expect(gate.accept('4006381333931', 10)).toBe(true);
    expect(gate.accept('0036000291452', 20)).toBe(false);
  });

  it('takes a custom gap', () => {
    const gate = new ScanGate(100);
    gate.accept('96385074', 0);
    expect(gate.accept('96385074', 101)).toBe(true);
  });
});

describe('recordScan', () => {
  it('starts an entry at one', () => {
    expect(recordScan([], '0036000291452', 'beans', 5)).toEqual([
      { barcode: '0036000291452', count: 1, itemId: 'beans', lastScannedAt: 5 },
    ]);
  });

  it('adds to an existing entry and moves it to the top', () => {
    const entries: ScanEntry[] = [
      { barcode: 'b', count: 1, lastScannedAt: 2 },
      { barcode: 'a', count: 2, itemId: 'item-a', lastScannedAt: 1 },
    ];
    expect(recordScan(entries, 'a', 'item-a', 9)).toEqual([
      { barcode: 'a', count: 3, itemId: 'item-a', lastScannedAt: 9 },
      { barcode: 'b', count: 1, lastScannedAt: 2 },
    ]);
  });

  it('keeps unmatched scans separate from earlier counted items', () => {
    const entries: ScanEntry[] = [
      { barcode: 'a', count: 1, itemId: 'item-a', lastScannedAt: 1 },
    ];
    expect(recordScan(entries, 'a', undefined, 2)).toEqual([
      { barcode: 'a', count: 1, lastScannedAt: 2 },
      { barcode: 'a', count: 1, itemId: 'item-a', lastScannedAt: 1 },
    ]);
  });

  it('records an unknown code without an item', () => {
    expect(recordScan([], 'x', undefined, 1)[0].itemId).toBeUndefined();
  });

  it('gives counted and unmatched entries distinct keys', () => {
    expect(scanEntryKey({ barcode: 'a', count: 1, lastScannedAt: 1 })).not.toBe(
      scanEntryKey({
        barcode: 'a',
        count: 1,
        itemId: 'item-a',
        lastScannedAt: 1,
      }),
    );
  });
});

describe('reconcileAddedItem', () => {
  const pending: ScanEntry[] = [{ barcode: 'a', count: 3, lastScannedAt: 1 }];

  it('uses the quantity actually saved', () => {
    expect(reconcileAddedItem(pending, 'a', 'item-a', 1)).toEqual([
      { barcode: 'a', count: 1, itemId: 'item-a', lastScannedAt: 1 },
    ]);
  });

  it('removes a zero-quantity saved entry', () => {
    expect(reconcileAddedItem(pending, 'a', 'item-a', 0)).toEqual([]);
  });
});

describe('undoScan', () => {
  const entries: ScanEntry[] = [
    { barcode: 'a', count: 2, lastScannedAt: 1 },
    { barcode: 'b', count: 1, lastScannedAt: 0 },
  ];

  it('takes one away', () => {
    expect(undoScan(entries, 'a')[0].count).toBe(1);
  });

  it('drops the entry at zero', () => {
    expect(undoScan(entries, 'b').map((e) => e.barcode)).toEqual(['a']);
  });

  it('leaves the list alone for an unknown code', () => {
    expect(undoScan(entries, 'zzz')).toEqual(entries);
  });

  it('only takes back units from the matching item association', () => {
    const mixed: ScanEntry[] = [
      { barcode: 'a', count: 1, itemId: 'item-a', lastScannedAt: 1 },
      { barcode: 'a', count: 2, lastScannedAt: 2 },
    ];
    expect(undoScan(mixed, 'a', undefined)).toEqual([
      mixed[0],
      { ...mixed[1], count: 1 },
    ]);
  });
});
