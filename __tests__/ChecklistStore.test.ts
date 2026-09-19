/**
 * @format
 */

import { ChecklistStore } from '../src/stores/ChecklistStore';
import { SQLiteDatabase } from '../src/types/database-types';

function emptyRows() {
  return { length: 0, item: (_index: number): Record<string, unknown> => ({}) };
}

describe('ChecklistStore', () => {
  let checklistStore: ChecklistStore;

  beforeEach(() => {
    checklistStore = new ChecklistStore();
  });

  afterEach(() => {
    checklistStore.dispose();
  });

  it('creates a checklist with default items, returns it, and trims the name', async () => {
    const created = await checklistStore.createChecklist(
      '  Supplies  ',
      false,
      ['Bravo', 'alpha'],
    );

    expect(checklistStore.checklists).toHaveLength(1);
    expect(created.name).toBe('Supplies');
    expect(checklistStore.checklists[0].name).toBe('Supplies');

    const items = checklistStore.getChecklistItems(
      checklistStore.checklists[0].id,
    );
    expect(items.map((item) => item.text)).toEqual(['alpha', 'Bravo']);
  });

  it('deletes a checklist and all of its items', async () => {
    await checklistStore.createChecklist('Supplies', false, ['Water']);
    const checklistId = checklistStore.checklists[0].id;

    await checklistStore.deleteChecklist(checklistId);

    expect(checklistStore.checklists).toEqual([]);
    expect(checklistStore.checklistItems).toEqual([]);
  });

  it('toggles a checklist item checked state', async () => {
    await checklistStore.createChecklist('Supplies');
    const checklistId = checklistStore.checklists[0].id;

    await checklistStore.addChecklistItem(checklistId, 'Water');
    const itemId = checklistStore.checklistItems[0].id;

    expect(checklistStore.checklistItems[0].checked).toBe(false);

    await checklistStore.toggleChecklistItem(itemId);
    expect(checklistStore.checklistItems[0].checked).toBe(true);

    await checklistStore.toggleChecklistItem(itemId);
    expect(checklistStore.checklistItems[0].checked).toBe(false);
  });

  it('loads default checklists when the database is empty', async () => {
    const executeSql = jest.fn(async (_sql: string) => [{ rows: emptyRows() }]);
    const database: SQLiteDatabase = { executeSql };

    await checklistStore.initDatabase(database);
    await checklistStore.loadChecklists();

    expect(
      checklistStore.checklists.map((checklist) => checklist.name),
    ).toEqual(['Bug-out bag', 'First-aid kit', 'Evacuation kit']);
    expect(checklistStore.checklistItems.length).toBeGreaterThan(0);
  });

  it('throws when checklist name is empty or whitespace only', async () => {
    await expect(checklistStore.createChecklist('')).rejects.toThrow(
      'Checklist name cannot be empty',
    );
    await expect(checklistStore.createChecklist('   ')).rejects.toThrow(
      'Checklist name cannot be empty',
    );
  });

  it('throws when checklist name duplicates an existing checklist ignoring case and whitespace', async () => {
    await checklistStore.createChecklist('Bug-out bag');

    await expect(
      checklistStore.createChecklist('  bug-out BAG  '),
    ).rejects.toThrow('A checklist named "bug-out BAG" already exists');
  });

  it('throws when checklist name exceeds the max length', async () => {
    await expect(
      checklistStore.createChecklist('x'.repeat(61)),
    ).rejects.toThrow('Checklist name cannot exceed 60 characters');
  });

  it('merges imported checklist data without duplicating existing ids', async () => {
    await checklistStore.importChecklistsData(
      [
        {
          id: 'existing-checklist',
          name: 'Existing',
          createdAt: 1,
          isDefault: false,
        },
      ],
      [
        {
          id: 'existing-item',
          checklistId: 'existing-checklist',
          text: 'Water',
          checked: false,
          order: 0,
        },
      ],
      'replace',
    );

    await checklistStore.importChecklistsData(
      [
        {
          id: 'existing-checklist',
          name: 'Existing',
          createdAt: 1,
          isDefault: false,
        },
        {
          id: 'new-checklist',
          name: 'New',
          createdAt: 2,
          isDefault: true,
        },
      ],
      [
        {
          id: 'existing-item',
          checklistId: 'existing-checklist',
          text: 'Water',
          checked: false,
          order: 0,
        },
        {
          id: 'new-item',
          checklistId: 'new-checklist',
          text: 'Radio',
          checked: true,
          order: 0,
        },
      ],
      'merge',
    );

    expect(checklistStore.checklists.map((checklist) => checklist.id)).toEqual([
      'existing-checklist',
      'new-checklist',
    ]);
    expect(checklistStore.checklistItems.map((item) => item.id)).toEqual([
      'existing-item',
      'new-item',
    ]);
  });
});
