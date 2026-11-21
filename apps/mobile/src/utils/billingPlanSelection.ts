export type PlanActionKind =
  | 'already_scheduled'
  | 'not_purchasable'
  | 'upgrade_now'
  | 'schedule_upgrade'
  | 'schedule_renew'
  | 'schedule_downgrade';

export interface BillingPlanLike {
  id: string;
  code: string;
  name: string;
  price: number;
  purchasable: boolean;
}

export interface EffectiveSubscriptionLike {
  plan?: { id: string; code: string; name: string; version?: number } | null;
  renewal?: { id: string; code: string; name: string; effectiveAt: string } | null;
  expiresAt?: string | null;
}

/**
 * Compares a catalog plan against an active or scheduled plan reference by ID first,
 * falling back to case-insensitive plan code.
 */
export function isSameBillingPlan(
  plan: Pick<BillingPlanLike, 'id' | 'code'>,
  target?: { id?: string; code?: string } | null
): boolean {
  if (!target) return false;
  if (plan.id && target.id && plan.id === target.id) return true;
  if (plan.code && target.code && plan.code.toUpperCase() === target.code.toUpperCase()) {
    return true;
  }
  return false;
}

/** Finds the catalog plan matching the user's effective subscription, prioritizing exact ID. */
export function findCurrentPlan<T extends BillingPlanLike>(
  plans: T[],
  effectiveSub: EffectiveSubscriptionLike | null | undefined
): T | null {
  const target = effectiveSub?.plan;
  if (!target) return null;
  const byId = plans.find((p) => p.id === target.id);
  if (byId) return byId;
  return (
    plans.find(
      (p) => Boolean(target.code) && p.code.toUpperCase() === target.code.toUpperCase()
    ) ?? null
  );
}

/**
 * Selects the default highlighted plan on the Premium screen:
 * - On Free or mid-tier paid plans (e.g. Plus): points to the next higher purchasable tier
 *   to encourage upgrading (`Free -> Plus`, `Plus -> Care`).
 * - When already on the highest tier (e.g. Care): points directly to the current plan
 *   instead of falling back to a cheaper tier.
 */
export function getDefaultSelectedPlanId<T extends BillingPlanLike>(
  sortedPlans: T[],
  effectiveSub: EffectiveSubscriptionLike | null | undefined
): string | null {
  if (sortedPlans.length === 0) return null;
  const currentPlan = findCurrentPlan(sortedPlans, effectiveSub);
  const currentPrice = currentPlan?.price ?? 0;

  const nextHigher = sortedPlans.find((p) => p.purchasable && p.price > currentPrice);
  if (nextHigher) return nextHigher.id;

  if (currentPlan) return currentPlan.id;

  return sortedPlans.find((p) => p.purchasable)?.id ?? sortedPlans[0]?.id ?? null;
}

/** Formats a plan or payment amount in VND or falls back to the localized free label. */
export function formatBillingMoney(
  amount: number,
  currency = 'VND',
  freeLabel = 'Miễn phí'
): string {
  if (!amount || amount <= 0) return freeLabel;
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

/** Classifies the CTA behavior for the currently selected catalog plan card. */
export function getPlanActionKind(
  selectedPlan: BillingPlanLike,
  currentPlan: BillingPlanLike | null,
  effectiveSub: EffectiveSubscriptionLike | null | undefined
): PlanActionKind {
  if (!selectedPlan.purchasable) return 'not_purchasable';
  if (effectiveSub?.renewal) return 'already_scheduled';

  const isPaidActive = Boolean(
    effectiveSub?.plan &&
      (currentPlan ? currentPlan.price > 0 : effectiveSub.plan.code.toUpperCase() !== 'FREE')
  );
  if (!isPaidActive) return 'upgrade_now';

  if (isSameBillingPlan(selectedPlan, effectiveSub?.plan)) return 'schedule_renew';
  if (currentPlan && selectedPlan.price < currentPlan.price) return 'schedule_downgrade';
  return 'schedule_upgrade';
}
