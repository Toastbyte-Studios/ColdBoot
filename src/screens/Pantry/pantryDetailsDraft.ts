import type { PantryItem, PantryItemDetails } from '../../stores/PantryStore';

/** The label-detail fields of the pantry form, as typed. */
export interface PantryDetailsDraft {
  brand: string;
  barcode: string;
  servingSize: string;
  caloriesPerServing: string;
  servingsPerUnit: string;
}

export const EMPTY_DETAILS_DRAFT: PantryDetailsDraft = {
  brand: '',
  barcode: '',
  servingSize: '',
  caloriesPerServing: '',
  servingsPerUnit: '',
};

/** The draft with one field replaced. */
export function withDetailsField(
  draft: PantryDetailsDraft,
  key: keyof PantryDetailsDraft,
  value: string,
): PantryDetailsDraft {
  return { ...draft, [key]: value };
}

/** The form's starting values for an existing item. */
export function detailsDraftFromItem(
  item: PantryItem | undefined,
): PantryDetailsDraft {
  if (!item) return EMPTY_DETAILS_DRAFT;
  return {
    brand: item.brand ?? '',
    barcode: item.barcode ?? '',
    servingSize: item.servingSize ?? '',
    caloriesPerServing: item.caloriesPerServing?.toString() ?? '',
    servingsPerUnit: item.servingsPerUnit?.toString() ?? '',
  };
}

/** A typed number, or `undefined` when blank, or `null` when not a number. */
function parseOptionalNumber(text: string): number | undefined | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export type ParsedDetails =
  | { ok: true; details: PantryItemDetails }
  | { ok: false; error: string };

/**
 * Turns the typed fields into store details. Every key is present, so saving
 * an edit with a field emptied clears it. Ranges and the barcode check digit
 * are left to the store, which reports them with its own messages.
 */
export function parseDetailsDraft(draft: PantryDetailsDraft): ParsedDetails {
  const caloriesPerServing = parseOptionalNumber(draft.caloriesPerServing);
  if (caloriesPerServing === null) {
    return { ok: false, error: 'Calories per serving must be a number' };
  }
  const servingsPerUnit = parseOptionalNumber(draft.servingsPerUnit);
  if (servingsPerUnit === null) {
    return { ok: false, error: 'Servings per unit must be a number' };
  }
  return {
    ok: true,
    details: {
      brand: draft.brand,
      barcode: draft.barcode,
      servingSize: draft.servingSize,
      caloriesPerServing,
      servingsPerUnit,
    },
  };
}
