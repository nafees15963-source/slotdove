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
  return {
    subject,
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><body style="margin:0;background:#f4f8f8;font-family:Arial,sans-serif;color:#0c2a2e"><div style="max-width:520px;margin:40px auto;padding:36px;background:#fff;border-radius:16px"><div style="font-size:24px;font-weight:bold;color:#0d7f79">slotdove.</div><h1 style="font-size:25px;line-height:1.3;margin-top:35px">${subject}</h1><p>${safe.business}</p><div style="padding:22px;background:#e7f5f3;border-radius:12px;margin:25px 0"><strong>${safe.service}</strong>${input.bookingNumber ? `<p style="font-family:monospace;font-size:15px;color:#0d7f79;margin:6px 0">${de ? 'Buchungsnummer' : 'Booking number'}: <b>${escapeHtml(input.bookingNumber)}</b></p>` : ''}<p>${safe.date}<br><small>${safe.timezone}</small></p><p>${safe.address}</p></div><p style="font-size:12px;color:#777">${de ? 'Für Änderungen nutze den privaten Link auf deiner Buchungsbestätigung oder kontaktiere das Unternehmen.' : 'To make changes, use the private link on your booking confirmation page or contact the business.'}</p><p style="font-size:10px;color:#999;margin-top:30px">Your time. Beautifully booked.</p></div></body></html>`,
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
export function emailConfigured() {
  return !!process.env.RESEND_API_KEY?.trim() && !!normalizeFrom(process.env.EMAIL_FROM);
}
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const key = process.env.RESEND_API_KEY?.trim(),
    from = normalizeFrom(process.env.EMAIL_FROM);
  if (!key || !from) return { state: 'unavailable' as const };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Keep Resend's reason (e.g. unverified domain) for the admin console; never the key.
    const reason = (await response.text().catch(() => '')).replace(/re_[A-Za-z0-9_]+/g, '[key]').slice(0, 160);
    throw new Error(`EMAIL_PROVIDER_${response.status}${reason ? `: ${reason}` : ''}`);
  }
  const result = await response.json();
  return { state: 'accepted' as const, id: String(result.id) };
}

export function invitationEmail(input: { business: string; url: string; locale: string }) {
  const de = input.locale === 'de';
  const title = de ? 'Deine Einladung zu Slotdove' : 'Your invitation to Slotdove';
  return {
    subject: title,
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><body style="font-family:Arial,sans-serif;background:#f4f8f8;padding:32px;color:#0c2a2e"><div style="background:#fff;border-radius:16px;padding:32px;max-width:500px;margin:auto"><strong style="color:#0d7f79;font-size:24px">slotdove.</strong><h1 style="font-size:25px">${title}</h1><p>${escapeHtml(input.business)}</p><p>${de ? 'Melde dich mit dieser bestätigten E-Mail-Adresse an, um die Einladung anzunehmen. Der Link gilt sieben Tage.' : 'Sign in with this verified email address to accept the invitation. The link expires in seven days.'}</p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#0d7f79;color:white;text-decoration:none;padding:14px 20px;border-radius:8px">${de ? 'Einladung öffnen' : 'Open invitation'}</a></div></body></html>`,
  };
}
/** Simple branded email with a title, a few lines and an optional button. */
export function noticeEmail(input: { locale: string; title: string; lines: string[]; cta?: { label: string; url: string } }) {
  const lines = input.lines.map((l) => `<p style="margin:8px 0">${escapeHtml(l)}</p>`).join('');
  const button = input.cta
    ? `<a href="${escapeHtml(input.cta.url)}" style="display:inline-block;margin-top:18px;background:#0d7f79;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:bold">${escapeHtml(input.cta.label)}</a>`
    : '';
  return {
    subject: input.title,
    html: `<!doctype html><html lang="${input.locale === 'de' ? 'de' : 'en'}"><body style="margin:0;background:#f4f8f8;font-family:Arial,sans-serif;color:#0c2a2e"><div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:18px"><div style="font-size:22px;font-weight:bold;color:#0d7f79">slotdove.</div><h1 style="font-size:22px;line-height:1.3;margin:26px 0 12px">${escapeHtml(input.title)}</h1>${lines}${button}<p style="font-size:11px;color:#999;margin-top:30px">Slotdove · ${input.locale === 'de' ? 'Diese E-Mail wurde automatisch versendet.' : 'This email was sent automatically.'}</p></div></body></html>`,
  };
}
