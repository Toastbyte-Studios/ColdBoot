import type { HeroTone } from '../../components/ModuleHero';
import type { Checklist, ChecklistItem } from '../../stores/ChecklistStore';

export type ChecklistProgress = {
  checklist: Checklist;
  done: number;
  total: number;
  /** The first item not yet ticked, in the order the list shows them. */
  next: ChecklistItem | null;
};

/**
 * Ticked and total items for each list. `itemsFor` should be the store's
 * `getChecklistItems`, so "next" is the first unticked item as the list
 * itself shows it.
 */
export function checklistProgress(
  checklists: Checklist[],
  itemsFor: (checklistId: string) => ChecklistItem[],
): ChecklistProgress[] {
  return checklists.map((checklist) => {
    const own = itemsFor(checklist.id);
    return {
      checklist,
      done: own.filter((item) => item.checked).length,
      total: own.length,
      next: own.find((item) => !item.checked) ?? null,
    };
  });
}

const isDone = (p: ChecklistProgress) => p.total > 0 && p.done === p.total;

/** A row's trailing value: "14/20", "Done", or nothing for an empty list. */
export function progressText(p: ChecklistProgress): string | undefined {
  if (p.total === 0) return undefined;
  return isDone(p) ? 'Done' : `${p.done}/${p.total}`;
}

export type ChecklistHeroState = {
  headline: string;
  tone?: HeroTone;
  detail: string;
  /** The list the headline is about, or null. */
  focus: ChecklistProgress | null;
  /** 0–1, for the progress bar. */
  fraction: number;
  listsDone: number;
  listsWithItems: number;
  done: number;
  total: number;
};

/**
 * The Checklists hero's lead: the list to finish next. That is the
 * unfinished list closest to done, since one ready bag beats three
 * half-packed ones; lists with nothing on them are ignored. When every list
 * is done, it says so.
 */
export function checklistHeroState(
  progress: ChecklistProgress[],
): ChecklistHeroState {
  const withItems = progress.filter((p) => p.total > 0);
  const totals = {
    listsDone: withItems.filter(isDone).length,
    listsWithItems: withItems.length,
    done: withItems.reduce((sum, p) => sum + p.done, 0),
    total: withItems.reduce((sum, p) => sum + p.total, 0),
  };

  if (withItems.length === 0) {
    return {
      headline: progress.length === 0 ? 'Make a checklist' : 'Add items',
      detail: 'List what goes in each kit, then tick items off as you pack.',
      focus: null,
      fraction: 0,
      ...totals,
    };
  }

  const unfinished = withItems
    .filter((p) => !isDone(p))
    // Closest to done first; ties keep the list order.
    .sort((a, b) => b.done / b.total - a.done / a.total);
  const focus = unfinished[0];

  if (!focus) {
    return {
      headline: 'All lists done',
      tone: 'good',
      detail: 'Re-check them when seasons change or supplies are used.',
      focus: null,
      fraction: 1,
      ...totals,
    };
  }

  return {
    headline: focus.checklist.name,
    tone: focus.done > 0 ? 'fair' : undefined,
    detail: `${focus.done} of ${focus.total} done`,
    focus,
    fraction: focus.done / focus.total,
    ...totals,
  };
}
