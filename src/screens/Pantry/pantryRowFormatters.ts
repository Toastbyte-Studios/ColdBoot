import { PantryItem } from '../../stores/PantryStore';

export function formatPantryItemQuantity(item: PantryItem): string {
  return `Quantity: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

export function formatPantryItemSubtitle(
  item: PantryItem,
  category = item.category,
): string {
  return item.notes ? `${category}. Notes: ${item.notes}` : category;
}
