/**
 * @format
 * PantryStore against a recording SQLite stand-in: migration 4 on an
 * existing install, and the SQL the store writes for product details.
 *
 * Jest has no real SQLite here, so the fake answers only the reads the store
 * makes and records every statement. Each statement's placeholders are
 * checked against its bound values, which is where a missed column shows up.
 */

type Row = Record<string, unknown>;
type Call = { sql: string; params: unknown[] };

/** Columns of `pantry_items` on an install that has run migrations 1–3. */
const V3_COLUMNS = [
  'id',
  'name',
  'category',
  'quantity',
  'unit',
  'notes',
  'expirationMonth',
  'expirationYear',
  'createdAt',
  'updatedAt',
];

const calls: Call[] = [];
let itemRows: Row[] = [];

function resultOf(rows: Row[]) {
  return [{ rows: { length: rows.length, item: (i: number) => rows[i] } }];
}

const mockDb = {
  executeSql: jest.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT id FROM schema_migrations')) {
      return resultOf([{ id: 1 }, { id: 2 }, { id: 3 }]);
    }
    if (sql === 'PRAGMA table_info(pantry_items)') {
      return resultOf(V3_COLUMNS.map((name) => ({ name })));
    }
    if (sql.startsWith('SELECT * FROM pantry_categories')) {
      return resultOf([{ name: 'Canned Goods', createdAt: 0 }]);
    }
    if (sql.startsWith('SELECT * FROM pantry_items')) {
      return resultOf(itemRows);
    }
    return resultOf([]);
  }),
};

jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: async () => mockDb,
}));

import { PantryStore } from '../src/stores/PantryStore';

const placeholderCount = (sql: string) => (sql.match(/\?/g) ?? []).length;

function lastCall(prefix: string): Call {
  const match = [...calls].reverse().find((c) => c.sql.startsWith(prefix));
  if (!match) throw new Error(`No statement starting "${prefix}"`);
  return match;
}

/** Column list of an INSERT, paired with the values bound to it. */
function insertedRow(call: Call): Record<string, unknown> {
  const columns = /\(([^)]*)\)\s*VALUES/
    .exec(call.sql)![1]
    .split(',')
    .map((c) => c.trim());
  return Object.fromEntries(columns.map((c, i) => [c, call.params[i]]));
}

describe('PantryStore SQL', () => {
  let store: PantryStore;

  beforeEach(async () => {
    calls.length = 0;
    itemRows = [
      {
        id: 'legacy',
        name: 'Rice',
        category: 'Canned Goods',
        quantity: 5,
        unit: 'lbs',
        notes: null,
        expirationMonth: null,
        expirationYear: null,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'scanned',
        name: 'Black Beans',
        category: 'Canned Goods',
        quantity: 6,
        unit: 'cans',
        notes: null,
        expirationMonth: 3,
        expirationYear: 2030,
        barcode: '0036000291452',
        brand: 'Store brand',
        servingSize: '1/2 cup',
        caloriesPerServing: 110,
        servingsPerUnit: 3.5,
        createdAt: 2,
        updatedAt: 2,
      },
    ];
    store = new PantryStore();
    await store.initDatabase();
  });

  afterEach(() => {
    // Every statement binds exactly as many values as it has placeholders.
    for (const call of calls) {
      expect([call.sql, call.params.length]).toEqual([
        call.sql,
        placeholderCount(call.sql),
      ]);
    }
  });

  it('migration 4 adds the product columns and a barcode index', () => {
    const executed = calls.map((c) => c.sql);
    expect(executed).toEqual(
      expect.arrayContaining([
        'ALTER TABLE pantry_items ADD COLUMN barcode TEXT',
        'ALTER TABLE pantry_items ADD COLUMN brand TEXT',
        'ALTER TABLE pantry_items ADD COLUMN servingSize TEXT',
        'ALTER TABLE pantry_items ADD COLUMN caloriesPerServing REAL',
        'ALTER TABLE pantry_items ADD COLUMN servingsPerUnit REAL',
        'CREATE INDEX IF NOT EXISTS idx_pantry_items_barcode ON pantry_items (barcode)',
      ]),
    );
    expect(
      calls.some(
        (c) =>
          c.sql.startsWith('INSERT INTO schema_migrations') &&
          c.params[0] === 'pantry' &&
          c.params[1] === 4,
      ),
    ).toBe(true);
  });

  it('loads rows with and without product details', () => {
    const legacy = store.items.find((i) => i.id === 'legacy')!;
    expect(legacy.barcode).toBeUndefined();
    expect(legacy.caloriesPerServing).toBeUndefined();

    expect(store.items.find((i) => i.id === 'scanned')).toMatchObject({
      barcode: '0036000291452',
      brand: 'Store brand',
      servingSize: '1/2 cup',
      caloriesPerServing: 110,
      servingsPerUnit: 3.5,
    });
    expect(store.findByBarcode('036000291452')).toHaveLength(1);
  });

  it('writes product details on create', async () => {
    await store.createItem(
      'Chili',
      'Canned Goods',
      2,
      'cans',
      undefined,
      undefined,
      undefined,
      { barcode: '036000291452', caloriesPerServing: 0, servingsPerUnit: 2 },
    );
    expect(insertedRow(lastCall('INSERT INTO pantry_items'))).toMatchObject({
      name: 'Chili',
      barcode: '0036000291452',
      brand: null,
      servingSize: null,
      caloriesPerServing: 0,
      servingsPerUnit: 2,
    });
  });

  it('writes and clears product details on update', async () => {
    await store.updateItem('scanned', {
      brand: 'Other brand',
      caloriesPerServing: undefined,
    });
    const update = lastCall('UPDATE pantry_items');
    const setColumns = /SET (.*) WHERE/
      .exec(update.sql)![1]
      .split(',')
      .map((c) => c.replace('= ?', '').trim());
    const bound = Object.fromEntries(
      setColumns.map((c, i) => [c, update.params[i]]),
    );
    expect(bound).toMatchObject({
      barcode: '0036000291452',
      brand: 'Other brand',
      caloriesPerServing: null,
      servingsPerUnit: 3.5,
    });
    expect(update.params[update.params.length - 1]).toBe('scanned');
  });

  it('restores product details from a backup', async () => {
    const scanned = store.items.find((i) => i.id === 'scanned')!;
    await store.importData(['Canned Goods'], [{ ...scanned }], 'replace');
    expect(
      insertedRow(lastCall('INSERT OR REPLACE INTO pantry_items')),
    ).toMatchObject({
      barcode: '0036000291452',
      caloriesPerServing: 110,
      servingsPerUnit: 3.5,
    });
  });

  it('counts quick quantity changes that each wait on the database', async () => {
    // 'legacy' starts at 5. Each write awaits the fake database, so without
    // queueing all three would read 5 and write 6.
    await Promise.all([
      store.adjustQuantity('legacy', 1),
      store.adjustQuantity('legacy', 1),
      store.adjustQuantity('legacy', 1),
    ]);
    expect(store.items.find((i) => i.id === 'legacy')!.quantity).toBe(8);
  });
});
