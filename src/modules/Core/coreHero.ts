import { formatAge } from '../../screens/DeviceStatus/deviceStatusFormatters';
import type { Checklist, ChecklistItem } from '../../stores/ChecklistStore';
import type { Note } from '../../stores/NotesStore';

export type ChecklistProgress = {
  checklist: Checklist;
  done: number;
  total: number;
};

/**
 * The checklist worth showing: the one furthest along that isn't finished
 * (it's the one you're in the middle of), else the first with any items.
 * Null when there are none with items.
 */
export function activeChecklist(
  checklists: readonly Checklist[],
  items: readonly ChecklistItem[],
): ChecklistProgress | null {
  const progress = checklists
    .map((checklist) => {
      const own = items.filter((item) => item.checklistId === checklist.id);
      return {
        checklist,
        done: own.filter((item) => item.checked).length,
        total: own.length,
      };
    })
    .filter((entry) => entry.total > 0);
  if (progress.length === 0) return null;

  const inProgress = progress
    .filter((entry) => entry.done > 0 && entry.done < entry.total)
    .sort(
      (a, b) =>
        b.done / b.total - a.done / a.total ||
        b.checklist.createdAt - a.checklist.createdAt,
    );
  return inProgress[0] ?? progress[0];
}

/** "Go bag · 3 of 7" */
export function checklistText(progress: ChecklistProgress): string {
  return `${progress.checklist.name} · ${progress.done} of ${progress.total}`;
}

/** The newest note or voice log. */
export function latestNote(notes: readonly Note[]): Note | null {
  return notes.reduce<Note | null>(
    (newest, note) =>
      !newest || note.createdAt > newest.createdAt ? note : newest,
    null,
  );
}

/** "Field notes · 2 hr ago", "Voice log · just now". */
export function noteText(note: Note, now: number = Date.now()): string {
  const name =
    note.title?.trim() ||
    (note.type === 'voice'
      ? 'Voice log'
      : note.type === 'sketch'
        ? 'Sketch'
        : 'Note');
  return `${name} · ${formatAge(note.createdAt, now).toLowerCase()}`;
}
