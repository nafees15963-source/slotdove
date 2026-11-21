import 'server-only';
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function appointmentEmail(input: {
  kind: string;
  locale: string;
  business: string;
  service: string;
  date: string;
  timezone: string;
  status: string;
  address: string;
  bookingNumber?: string;
}) {
  const de = input.locale === 'de';
  const titles: Record<string, string> = de
    ? {
        confirmation:
          input.status === 'pending' ? 'Deine Terminanfrage' : 'Dein Termin ist bestätigt',
        cancellation: 'Dein Termin wurde storniert',
        reschedule: 'Dein Termin wurde verschoben',
        reminder: 'Dein Termin steht bevor',
      }
    : {
        confirmation:
          input.status === 'pending' ? 'Your appointment request' : 'Your appointment is confirmed',
        cancellation: 'Your appointment is cancelled',
        reschedule: 'Your appointment has moved',
        reminder: 'Your appointment is coming up',
      };
  const subject = titles[input.kind] || titles.confirmation;
  const safe = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, escapeHtml(v)]));
  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 0;border-top:1px solid #ecebe5;font-size:13px;color:#7a8689;width:38%">${label}</td><td style="padding:10px 0;border-top:1px solid #ecebe5;font-size:15px;color:#1c2b2e;font-weight:600">${value}</td></tr>`;
  const details = [
    row(de ? 'Leistung' : 'Service', safe.service),
    row(de ? 'Wann' : 'When', `${safe.date}<br><span style="font-weight:400;font-size:12px;color:#7a8689">${safe.timezone}</span>`),
    safe.address ? row(de ? 'Wo' : 'Where', safe.address) : '',
    input.bookingNumber ? row(de ? 'Buchungsnummer' : 'Booking number', `<span style="font-family:ui-monospace,Menlo,monospace;letter-spacing:0.04em">${escapeHtml(input.bookingNumber)}</span>`) : '',
  ].join('');
  const note = de
    ? 'Ändern oder absagen kannst du über den privaten Link aus deiner Buchungsbestätigung – oder direkt beim Betrieb. Für den Termin ist allein der Betrieb verantwortlich.'
    : 'Use the private link from your booking confirmation to change or cancel – or contact the business directly.';
  return {
    subject: `${subject} · ${input.business}`,
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1c2b2e"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e4dd;border-radius:16px"><tr><td style="padding:30px 32px 28px"><div style="font-size:13px;font-weight:600;color:#7a8689">${safe.business}</div><h1 style="margin:8px 0 20px;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:#1c2b2e">${subject}</h1><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details}</table><p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#5d6b6e">${note}</p></td></tr></table><p style="max-width:520px;margin:16px auto 0;font-size:11.5px;color:#8a9496">${de ? 'Gesendet über Slotdove – ein privates, kostenloses Testprojekt.' : 'Sent via Slotdove – a private, free test project.'}</p></td></tr></table></body></html>`,
  };
}
/** Accepts common ways of writing the sender and returns "Name <email>". */
export function normalizeFrom(raw: string | undefined) {
  const value = (raw || '').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!value) return '';
  const email = value.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
  if (email) {
    const name = value.replace(email, '').replace(/[<>"'`()]/g, '').trim();
    return `${name || 'Slotdove'} <${email}>`;
  }
  // Only a domain was given, e.g. "slotdove.de".
  const domain = value.match(/^(?:https?:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?$/i)?.[1];
  return domain ? `Slotdove <termine@${domain.toLowerCase()}>` : '';
}
/** Which provider sends: Brevo if BREVO_API_KEY is set (free, works with a single verified
 * sender address, no own domain needed), otherwise Resend (needs a verified domain). */
export function emailProvider(): 'brevo' | 'resend' | null {
  if (process.env.BREVO_API_KEY?.trim()) return 'brevo';
  if (process.env.RESEND_API_KEY?.trim()) return 'resend';
  return null;
}
export function emailConfigured() {
  return !!emailProvider() && !!normalizeFrom(process.env.EMAIL_FROM);
}
function redact(text: string) {
  return text.replace(/(re_|xkeysib-)[A-Za-z0-9_-]+/g, '[key]').slice(0, 160);
}
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const provider = emailProvider(),
    from = normalizeFrom(process.env.EMAIL_FROM);
  if (!provider || !from) return { state: 'unavailable' as const };
  if (provider === 'brevo') {
    const match = from.match(/^(.*) <(.+)>$/);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY!.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: match?.[1] || 'Slotdove', email: match?.[2] || from },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        headers: { 'X-Slotdove-Key': input.idempotencyKey.slice(0, 200) },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const reason = redact(await response.text().catch(() => ''));
      throw new Error(`EMAIL_PROVIDER_${response.status}${reason ? `: ${reason}` : ''}`);
    }
    const result = await response.json().catch(() => ({}));
    return { state: 'accepted' as const, id: String(result.messageId || '') };
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Keep the provider's reason (e.g. unverified domain) for the admin console; never the key.
    const reason = redact(await response.text().catch(() => ''));
    throw new Error(`EMAIL_PROVIDER_${response.status}${reason ? `: ${reason}` : ''}`);
  }
  const result = await response.json();
  return { state: 'accepted' as const, id: String(result.id) };
}

export function invitationEmail(input: { business: string; url: string; locale: string }) {
  const de = input.locale === 'de';
  return noticeEmail({
    locale: input.locale,
    title: de ? `Einladung ins Team von ${input.business}` : `Invitation to join ${input.business}`,
    lines: de
      ? [`Du wurdest eingeladen, dem Team von „${input.business}“ bei Slotdove beizutreten.`, 'Melde dich mit genau dieser E-Mail-Adresse an oder erstelle ein Konto und nimm die Einladung an. Der Link ist sieben Tage gültig.']
      : [`You were invited to join “${input.business}” on Slotdove.`, 'Sign in or create an account with this exact email address to accept. The link expires in seven days.'],
    cta: { label: de ? 'Einladung öffnen' : 'Open invitation', url: input.url },
  });
}
/** Branded e-mail in the Slotdove "paper & ink" style: title, a few lines, optional button.
 * Table-based and inline-styled so it renders in Outlook, Gmail and Apple Mail alike. */
export function noticeEmail(input: { locale: string; title: string; lines: string[]; cta?: { label: string; url: string } }) {
  const de = input.locale !== 'en';
  const lines = input.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#33454a">${escapeHtml(l)}</p>`).join('');
  const button = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:#0f6e66;border-radius:10px"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(input.cta.label)}</a></td></tr></table>`
    : '';
  const foot = de
    ? 'Slotdove ist ein privates, kostenloses Testprojekt. Diese E-Mail wurde automatisch versendet.'
    : 'Slotdove is a private, free test project. This email was sent automatically.';
  return {
    subject: input.title,
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1c2b2e"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e4dd;border-radius:16px"><tr><td style="padding:30px 32px 26px"><div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#1c2b2e">slotdove<span style="color:#0f6e66">.</span></div><h1 style="margin:26px 0 14px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#1c2b2e">${escapeHtml(input.title)}</h1>${lines}${button}</td></tr></table><p style="max-width:520px;margin:16px auto 0;font-size:11.5px;line-height:1.5;color:#8a9496">${foot}</p></td></tr></table></body></html>`,
  };
}
