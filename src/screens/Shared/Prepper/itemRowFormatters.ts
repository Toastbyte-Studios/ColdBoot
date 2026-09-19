/**
 * Row copy shared by the Pantry and Inventory lists.
 *
 * Both stores hold the same shape — a name, a category, a quantity with an
 * optional unit, optional notes — and both render it as a `ModuleRow`, so the
 * subtitle and the trailing value are formatted in one place rather than once
 * per module.
 */
export type StockItem = {
  category: string;
  quantity: number;
  unit?: string;
  notes?: string;
};

export function formatItemQuantity(item: StockItem): string {
  return `Quantity: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

export function formatItemSubtitle(
  item: StockItem,
  category = item.category,
): string {
  return item.notes ? `${category}. Notes: ${item.notes}` : category;
}
