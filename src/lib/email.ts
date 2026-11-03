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
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><body style="margin:0;background:#f6f5fa;font-family:Arial,sans-serif;color:#282631"><div style="max-width:520px;margin:40px auto;padding:36px;background:#fff;border-radius:16px"><div style="font-size:24px;font-weight:bold;color:#7460db">slotdove.</div><h1 style="font-size:25px;line-height:1.3;margin-top:35px">${subject}</h1><p>${safe.business}</p><div style="padding:22px;background:#f4f1fc;border-radius:12px;margin:25px 0"><strong>${safe.service}</strong><p>${safe.date}<br><small>${safe.timezone}</small></p><p>${safe.address}</p></div><p style="font-size:12px;color:#777">${de ? 'Für Änderungen nutze den privaten Link auf deiner Buchungsbestätigung oder kontaktiere das Unternehmen.' : 'To make changes, use the private link on your booking confirmation page or contact the business.'}</p><p style="font-size:10px;color:#999;margin-top:30px">Your time. Beautifully booked.</p></div></body></html>`,
  };
}
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const key = process.env.RESEND_API_KEY,
    from = process.env.EMAIL_FROM;
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
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
  const result = await response.json();
  return { state: 'accepted' as const, id: String(result.id) };
}

export function invitationEmail(input: { business: string; url: string; locale: string }) {
  const de = input.locale === 'de';
  const title = de ? 'Deine Einladung zu Slotdove' : 'Your invitation to Slotdove';
  return {
    subject: title,
    html: `<!doctype html><html lang="${de ? 'de' : 'en'}"><body style="font-family:Arial,sans-serif;background:#f6f5fa;padding:32px;color:#282631"><div style="background:#fff;border-radius:16px;padding:32px;max-width:500px;margin:auto"><strong style="color:#7460db;font-size:24px">slotdove.</strong><h1 style="font-size:25px">${title}</h1><p>${escapeHtml(input.business)}</p><p>${de ? 'Melde dich mit dieser bestätigten E-Mail-Adresse an, um die Einladung anzunehmen. Der Link gilt sieben Tage.' : 'Sign in with this verified email address to accept the invitation. The link expires in seven days.'}</p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#7460db;color:white;text-decoration:none;padding:14px 20px;border-radius:8px">${de ? 'Einladung öffnen' : 'Open invitation'}</a></div></body></html>`,
  };
}
