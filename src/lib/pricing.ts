import 'server-only';
import { BILLING_ENABLED, PLAN_DEFAULTS, type PlanId } from './billing';
/** Public plan configuration; proposed defaults remain explicit during setup. */
export async function getPlanPricing() {
  const result = structuredClone(PLAN_DEFAULTS);
  if (!BILLING_ENABLED) return result;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return result;
  try {
    const response = await fetch(`${url}/rest/v1/plans?select=id,monthly_price_cents,currency`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 60 },
    });
    if (!response.ok) return result;
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) return result;
    for (const row of rows) {
      if (
        row &&
        typeof row === 'object' &&
        'id' in row &&
        typeof row.id === 'string' &&
        Object.hasOwn(result, row.id) &&
        'monthly_price_cents' in row &&
        Number.isInteger(row.monthly_price_cents) &&
        Number(row.monthly_price_cents) >= 0 &&
        'currency' in row &&
        typeof row.currency === 'string' &&
        /^[A-Z]{3}$/.test(row.currency)
      ) {
        result[row.id as PlanId] = {
          ...result[row.id as PlanId],
          monthlyPriceCents: Number(row.monthly_price_cents),
          currency: row.currency,
        };
      }
    }
  } catch {
    /* An unconfigured project still shows clearly marked proposed launch prices. */
  }
  return result;
}
