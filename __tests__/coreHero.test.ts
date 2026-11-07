import {
  activeChecklist,
  checklistText,
  latestNote,
  noteText,
} from '../src/modules/Core/coreHero';
import type { Checklist, ChecklistItem } from '../src/stores/ChecklistStore';
import type { Note } from '../src/stores/NotesStore';

const list = (id: string, name: string, createdAt = 0): Checklist => ({
  id,
  name,
  createdAt,
  isDefault: false,
});
const items = (checklistId: string, done: number, total: number) =>
  Array.from(
    { length: total },
    (_, i): ChecklistItem => ({
      id: `${checklistId}-${i}`,
      checklistId,
      text: `Item ${i}`,
      checked: i < done,
      order: i,
    }),
  );

describe('activeChecklist', () => {
  it('prefers the list you are part-way through', () => {
    const lists = [
      list('a', 'Car kit'),
      list('b', 'Go bag'),
      list('c', 'Done'),
    ];
    const result = activeChecklist(lists, [
      ...items('a', 0, 5),
      ...items('b', 3, 7),
      ...items('c', 4, 4),
    ]);
    expect(result && checklistText(result)).toBe('Go bag · 3 of 7');
  });

  it('falls back to the first list with items, or none', () => {
    const lists = [list('a', 'Empty'), list('b', 'Car kit')];
    expect(activeChecklist(lists, items('b', 0, 5))?.checklist.name).toBe(
      'Car kit',
    );
    expect(activeChecklist(lists, [])).toBeNull();
  });
});

describe('latest note', () => {
  const note = (over: Partial<Note>): Note => ({
    id: 'n',
    createdAt: 0,
    category: 'General' as Note['category'],
    type: 'text',
    photoUris: [],
    ...over,
  });

  it('finds the newest and names it', () => {
    const now = 1_800_000_000_000;
    const newest = latestNote([
      note({ id: '1', createdAt: now - 86_400_000, title: 'Old' }),
      note({ id: '2', createdAt: now - 2 * 3_600_000, title: 'Field notes' }),
    ]);
    expect(newest?.id).toBe('2');
    expect(newest && noteText(newest, now)).toBe('Field notes · 2 hr ago');
  });

  it('names untitled voice logs and sketches by type', () => {
    const now = 1_800_000_000_000;
    expect(noteText(note({ type: 'voice', createdAt: now }), now)).toBe(
      'Voice log · just now',
    );
    expect(noteText(note({ type: 'sketch', createdAt: now }), now)).toBe(
      'Sketch · just now',
    );
    expect(latestNote([])).toBeNull();
  });
});
