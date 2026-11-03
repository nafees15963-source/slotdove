import { it, expect } from 'vitest';
import { billingProvider, canUseFeature, PLAN_DEFAULTS } from '../src/lib/billing';
it('all scheduling accounts are independent of Stripe', () => {
  expect(billingProvider.enabled).toBe(false);
  expect(PLAN_DEFAULTS.free.monthlyPriceCents).toBe(0);
});
it('checkout cannot pretend to charge while disabled', async () => {
  await expect(billingProvider.createCheckout('example', 'pro')).rejects.toThrow(
    'BILLING_DISABLED',
  );
});
it('payment redirects cannot establish a subscription', async () => {
  await expect(billingProvider.verifyWebhook('success=true', '')).rejects.toThrow(
    'BILLING_DISABLED',
  );
});
it('features require an explicit entitlement', () => {
  expect(canUseFeature({ booking: true }, 'booking')).toBe(true);
  expect(canUseFeature({ booking: true }, 'admin')).toBe(false);
});
