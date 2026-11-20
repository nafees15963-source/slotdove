/** Public platform settings (free release window, voluntary support link).
 * Read through the public REST API so static pages can cache them for 60 s. */
export type Release = { free_from: string; free_until: string; invite_only: boolean };
export type Support = { enabled: boolean; url: string; text: string };
export const RELEASE_DEFAULT: Release = { free_from: '2027-01-01', free_until: '2027-12-31', invite_only: true };
export const SUPPORT_DEFAULT: Support = { enabled: false, url: '', text: '' };
/** Only well-known payment pages may be linked (prevents a hijacked setting from pointing to phishing). */
export const SUPPORT_HOSTS = ['paypal.me', 'www.paypal.me', 'www.paypal.com', 'paypal.com', 'ko-fi.com', 'buymeacoffee.com', 'www.buymeacoffee.com', 'buy.stripe.com', 'donate.stripe.com'];
export function safeSupportUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && SUPPORT_HOSTS.includes(u.hostname) && !u.username && !u.password ? u.toString() : '';
  } catch {
    return '';
  }
}
export async function publicSettings(): Promise<{ release: Release; support: Support }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const out = { release: RELEASE_DEFAULT, support: SUPPORT_DEFAULT };
  if (!url || !key) return out;
  try {
    const r = await fetch(`${url}/rest/v1/platform_settings?key=in.(release,support)&select=key,value`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 60 },
    });
    if (!r.ok) return out;
    for (const row of (await r.json()) as { key: string; value: Record<string, unknown> }[]) {
      if (row.key === 'release') out.release = { ...RELEASE_DEFAULT, ...(row.value as Partial<Release>) };
      if (row.key === 'support') {
        const s = { ...SUPPORT_DEFAULT, ...(row.value as Partial<Support>) };
        s.url = safeSupportUrl(s.url);
        s.enabled = s.enabled && !!s.url;
        out.support = s;
      }
    }
  } catch {
    /* defaults */
  }
  return out;
}
export const dateDe = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};
