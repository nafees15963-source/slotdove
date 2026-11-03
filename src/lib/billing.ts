/** Entitlements describe access independently from the payment provider. Stripe
 * checkout and webhook processing are intentionally not activated. */
export const BILLING_ENABLED = false;
export type PlanId = 'free' | 'pro' | 'business';
export const PLAN_DEFAULTS: Record<
  PlanId,
  { name: string; monthlyPriceCents: number; currency: string }
> = {
  free: { name: 'Free', monthlyPriceCents: 0, currency: 'USD' },
  pro: { name: 'Pro', monthlyPriceCents: 1500, currency: 'USD' },
  business: { name: 'Business', monthlyPriceCents: 3900, currency: 'USD' },
};
export interface BillingProvider {
  readonly enabled: boolean;
  createCheckout(businessId: string, plan: PlanId): Promise<{ url: string }>;
  verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<{ eventId: string; businessId: string; plan: PlanId }>;
}
export function canUseFeature(features: Record<string, boolean>, feature: string) {
  return features[feature] === true;
}
export const billingProvider: BillingProvider = {
  enabled: BILLING_ENABLED,
  async createCheckout() {
    throw new Error('BILLING_DISABLED');
  },
  async verifyWebhook() {
    throw new Error('BILLING_DISABLED');
  },
};
