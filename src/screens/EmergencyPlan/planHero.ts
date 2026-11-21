import type { HeroTone } from '../../components/ModuleHero';
import type { CommunicationPlan } from '../../stores/EmergencyPlanStore';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A finished plan older than this is flagged for a review. */
export const PLAN_REVIEW_DAYS = 180;

export type PlanSection =
  | 'EmergencyContacts'
  | 'RallyPoints'
  | 'CommunicationPlan';

/**
 * Whether any part of the communication plan has been written. Shared with
 * Device Status' readiness check so the two agree.
 */
export function hasCommsPlan(plan: CommunicationPlan): boolean {
  return (
    plan.updatedAt > 0 &&
    [
      plan.whoCallsWhom,
      plan.ifPhonesDown,
      plan.outOfAreaContact,
      plan.checkInSchedule,
    ].some((value) => value.trim().length > 0)
  );
}

type Named = { name: string; updatedAt: number };

export type PlanHeroInput = {
  contacts: Named[];
  rallyPoints: Named[];
  communicationPlan: CommunicationPlan;
  now: number;
};

export type PlanHeroState = {
  headline: string;
  tone?: HeroTone;
  detail: string;
  /** Contacts, rally point, comms plan: which are done. */
  parts: [boolean, boolean, boolean];
  /** Where the headline leads, or null when there is nothing to add. */
  next: PlanSection | null;
};

/** "today", "yesterday", "12 days ago", "7 months ago". */
export function updatedText(at: number, now: number): string {
  const days = Math.max(0, Math.floor((now - at) / DAY_MS));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * The plan's state as the hero tells it: the next part to add, or that the
 * plan is ready, or that a finished plan is old enough to look over again
 * (people move, numbers change).
 */
export function planHeroState(input: PlanHeroInput): PlanHeroState {
  const parts: [boolean, boolean, boolean] = [
    input.contacts.length > 0,
    input.rallyPoints.length > 0,
    hasCommsPlan(input.communicationPlan),
  ];
  const done = parts.filter(Boolean).length;

  if (done === 0) {
    return {
      headline: 'Start your plan',
      detail: 'Who to call, where to meet, and what to do if phones are down.',
      parts,
      next: 'EmergencyContacts',
    };
  }

  if (done < 3) {
    const [contacts, rally] = parts;
    const next: PlanSection = !contacts
      ? 'EmergencyContacts'
      : !rally
        ? 'RallyPoints'
        : 'CommunicationPlan';
    return {
      headline:
        next === 'EmergencyContacts'
          ? 'Add a contact'
          : next === 'RallyPoints'
            ? 'Add a rally point'
            : 'Write a comms plan',
      tone: 'fair',
      detail: `${done} of 3 parts done`,
      parts,
      next,
    };
  }

  const lastUpdated = Math.max(
    input.communicationPlan.updatedAt,
    ...input.contacts.map((c) => c.updatedAt),
    ...input.rallyPoints.map((r) => r.updatedAt),
  );
  const when = updatedText(lastUpdated, input.now);
  if (input.now - lastUpdated > PLAN_REVIEW_DAYS * DAY_MS) {
    return {
      headline: 'Time to review',
      tone: 'fair',
      detail: `Last updated ${when}. Check numbers and places still hold.`,
      parts,
      next: 'EmergencyContacts',
    };
  }
  return {
    headline: 'Plan ready',
    tone: 'good',
    detail: `Last updated ${when}`,
    parts,
    next: null,
  };
}

/** "Mom", "Mom, Dave", "Mom +2". */
export function namesText(items: { name: string }[]): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0].name;
  if (items.length === 2) return `${items[0].name}, ${items[1].name}`;
  return `${items[0].name} +${items.length - 1}`;
}
