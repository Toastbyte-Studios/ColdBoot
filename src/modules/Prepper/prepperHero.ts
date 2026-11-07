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

function expirationTimestamp(item: PantryItem): number | null {
  if (!item.expirationMonth || !item.expirationYear) return null;
  const timestamp = new Date(
    item.expirationYear,
    item.expirationMonth,
    0,
    23,
    59,
    59,
    999,
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isExpired(item: PantryItem, now: Date): boolean {
  const expiresAt = expirationTimestamp(item);
  return expiresAt !== null && expiresAt < now.getTime();
}

/**
 * The pantry item that runs out first, given the store's own day count
 * (dates are kept to the month, so an item lasts to the end of its month).
 */
export function expiryHeadline(
  sortedByExpiration: readonly PantryItem[],
  daysRemaining: (item: PantryItem) => number | null,
  now: Date = new Date(),
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
  if (isExpired(next, now)) {
    const expired = sortedByExpiration.filter((item) =>
      isExpired(item, now),
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
  now: Date = new Date(),
): { expired: number; soon: number } {
  let expired = 0;
  let soon = 0;
  for (const item of items) {
    const days = daysRemaining(item);
    if (days === null) continue;
    if (isExpired(item, now)) expired += 1;
    else if (days <= 30) soon += 1;
  }
  return { expired, soon };
}
