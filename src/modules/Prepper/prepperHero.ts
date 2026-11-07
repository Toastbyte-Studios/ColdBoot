import type { HeroTone } from '../../components/ModuleHero';
import type { PantryItem } from '../../stores/PantryStore';

export type ExpiryHeadline = {
  headline: string;
  detail: string;
  tone?: HeroTone;
};

/** "Nov 2026": pantry dates are kept to the month. */
function monthLabel(item: PantryItem): string {
  if (!item.expirationMonth || !item.expirationYear) return '';
  return new Date(
    item.expirationYear,
    item.expirationMonth - 1,
    1,
  ).toLocaleDateString([], { month: 'short', year: 'numeric' });
}

/**
 * The pantry item that runs out first, given the store's own day count
 * (dates are kept to the month, so an item lasts to the end of its month).
 */
export function expiryHeadline(
  sortedByExpiration: readonly PantryItem[],
  daysRemaining: (item: PantryItem) => number | null,
): ExpiryHeadline {
  const next = sortedByExpiration[0];
  const days = next ? daysRemaining(next) : null;
  if (!next || days === null) {
    return {
      headline: 'No expiry dates yet',
      detail: 'Add expiry dates to pantry items to see what to use first.',
      tone: 'muted',
    };
  }
  if (days <= 0) {
    const expired = sortedByExpiration.filter(
      (item) => (daysRemaining(item) ?? 1) <= 0,
    ).length;
    return {
      headline: next.name,
      detail:
        expired > 1
          ? `Expired ${monthLabel(next)} · ${expired - 1} more expired`
          : `Expired ${monthLabel(next)}`,
      tone: 'poor',
    };
  }
  return {
    headline: next.name,
    detail: `Use by end of ${monthLabel(next)} · ${days} day${days === 1 ? '' : 's'} left`,
    tone: days <= 30 ? 'fair' : undefined,
  };
}

/** How many dated items have expired, and how many expire within 30 days. */
export function expiryCounts(
  items: readonly PantryItem[],
  daysRemaining: (item: PantryItem) => number | null,
): { expired: number; soon: number } {
  let expired = 0;
  let soon = 0;
  for (const item of items) {
    const days = daysRemaining(item);
    if (days === null) continue;
    if (days <= 0) expired += 1;
    else if (days <= 30) soon += 1;
  }
  return { expired, soon };
}
