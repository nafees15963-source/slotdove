import 'server-only';
/** Server configuration check. Reports only whether values look right, never the values. */
type Check = { key: string; ok: boolean; required: boolean; hint: string };
const looks = {
  url: (v: string) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v.replace(/\/$/, '')),
  publishable: (v: string) => /^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(v),
  secret: (v: string) => /^(sb_secret_[A-Za-z0-9_-]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(v),
  resend: (v: string) => /^re_[A-Za-z0-9_]{10,}$/.test(v),
  groq: (v: string) => /^gsk_[A-Za-z0-9]{20,}$/.test(v),
  site: (v: string) => /^https:\/\/[a-z0-9.-]+$/.test(v.replace(/\/$/, '')),
};
export function checkEnv(): Check[] {
  const v = (k: string) => (process.env[k] || '').trim().replace(/^["']|["']$/g, '');
  const checks: Check[] = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', ok: looks.url(v('NEXT_PUBLIC_SUPABASE_URL')), required: true, hint: 'https://<projekt>.supabase.co' },
    { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ok: looks.publishable(v('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')), required: true, hint: 'sb_publishable_… (öffentlich, darf im Browser sein)' },
    { key: 'SUPABASE_SECRET_KEY', ok: looks.secret(v('SUPABASE_SECRET_KEY')), required: true, hint: 'sb_secret_… – nur auf dem Server, niemals mit NEXT_PUBLIC_' },
    { key: 'NEXT_PUBLIC_SITE_URL', ok: looks.site(v('NEXT_PUBLIC_SITE_URL')), required: false, hint: 'https://slotdove.vercel.app (für Links in E-Mails)' },
    { key: 'RESEND_API_KEY', ok: looks.resend(v('RESEND_API_KEY')), required: false, hint: 're_… für E-Mail-Versand' },
    { key: 'EMAIL_FROM', ok: /@/.test(v('EMAIL_FROM')), required: false, hint: 'Slotdove <termine@deine-domain.de>' },
    { key: 'GROQ_API_KEY', ok: looks.groq(v('GROQ_API_KEY')), required: false, hint: 'gsk_… für die smarte KI' },
    { key: 'RATE_LIMIT_SECRET', ok: v('RATE_LIMIT_SECRET').length >= 32, required: false, hint: 'Zufälliger Text, mind. 32 Zeichen (sonst wird der Server-Schlüssel genutzt)' },
  ];
  // A secret accidentally exposed to the browser is the most dangerous mistake.
  const leaked = Object.keys(process.env).filter(
    (k) => k.startsWith('NEXT_PUBLIC_') && /SECRET|SERVICE_ROLE|RESEND|GROQ|PASSWORD|PRIVATE/i.test(k),
  );
  for (const k of leaked) checks.unshift({ key: k, ok: false, required: true, hint: 'GEFAHR: Geheime Werte dürfen nie mit NEXT_PUBLIC_ beginnen – sofort löschen und Schlüssel erneuern.' });
  return checks;
}
