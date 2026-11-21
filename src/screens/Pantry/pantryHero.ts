import { caloriesPerUnit, type PantryItem } from '../../stores/PantryStore';
import type { HeroTone } from '../../components/ModuleHero';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Days left until the end of an item's expiry month; null when undated. */
export type DaysLeft = (item: PantryItem) => number | null;

export type PantryHeroState = {
  eyebrow: string;
  headline: string;
  tone?: HeroTone;
  detail: string;
  expired: number;
  expiringSoon: number;
};

function monthText(item: PantryItem): string {
  return `${MONTHS[(item.expirationMonth ?? 1) - 1]} ${item.expirationYear}`;
}

/**
 * The Pantry hero's lead: the item to use first. Expired food outranks
 * food about to expire, which outranks the rest; undated items never lead.
 * An empty pantry, or one with no dates, gets a prompt instead.
 */
export function pantryHeroState(
  items: PantryItem[],
  daysLeft: DaysLeft,
): PantryHeroState {
  const dated = items
    .map((item) => ({ item, days: daysLeft(item) }))
    .filter((entry): entry is { item: PantryItem; days: number } =>
      Number.isFinite(entry.days),
    )
    .sort((a, b) => a.days - b.days);
  const expired = dated.filter((entry) => entry.days <= 0).length;
  const expiringSoon = dated.filter(
    (entry) => entry.days > 0 && entry.days <= 30,
  ).length;

  if (items.length === 0) {
    return {
      eyebrow: 'Pantry',
      headline: 'Stock your pantry',
      detail: 'Add food by category, with an expiry month to track it.',
      expired,
      expiringSoon,
    };
  }

  const first = dated[0];
  if (!first) {
    return {
      eyebrow: 'Use first',
      headline: 'No dates yet',
      tone: 'muted',
      detail: 'Add expiry months to see what to use first.',
      expired,
      expiringSoon,
    };
  }

  const { item, days } = first;
  const when = monthText(item);
  if (days <= 0) {
    return {
      eyebrow: 'Expired',
      headline: item.name,
      tone: 'poor',
      detail: `Expired ${when}. Check it before eating, or replace it.`,
      expired,
      expiringSoon,
    };
  }
  return {
    eyebrow: 'Use first',
    headline: item.name,
    tone: days <= 30 ? 'fair' : undefined,
    detail:
      days <= 30
        ? `Expires ${when}. Plan it into the next few weeks of meals.`
        : `Expires ${when}. Nothing else is due sooner.`,
    expired,
    expiringSoon,
  };
}

export type CalorieTotal = {
  /** Calories across items whose labels give them. */
  total: number;
  /** Whether some items have no calorie facts, so the total is a floor. */
  partial: boolean;
};

/** Calories on hand, from the items whose label facts allow it. */
export function calorieTotal(items: PantryItem[]): CalorieTotal | null {
  let total = 0;
  let known = 0;
  for (const item of items) {
    const perUnit = caloriesPerUnit(item);
    if (perUnit == null || !(item.quantity > 0)) continue;
    total += perUnit * item.quantity;
    known += 1;
  }
  if (known === 0) return null;
  return { total, partial: known < items.length };
}

/** "850 kcal", "12.4k kcal", "1.2M kcal"; a "+" when it's a floor. */
export function calorieText({ total, partial }: CalorieTotal): string {
  const plus = partial ? '+' : '';
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(1)}M${plus} kcal`;
  }
  if (total >= 10_000) return `${Math.round(total / 1000)}k${plus} kcal`;
  if (total >= 1_000) return `${(total / 1000).toFixed(1)}k${plus} kcal`;
  return `${Math.round(total)}${plus} kcal`;
}
