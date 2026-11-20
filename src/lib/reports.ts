import 'server-only';
import { noticeEmail, sendEmail } from './email';

/** Optional alert to the platform team (set ADMIN_ALERT_EMAIL in the environment). Never throws. */
export async function notifyAdmins(caseNumber: string, category: string) {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) return;
  try {
    await sendEmail({
      ...noticeEmail({
        locale: 'de',
        title: `Neue Meldung ${caseNumber}`,
        lines: [`Kategorie: ${category}`, 'Bitte im Admin-Panel unter „Meldungen“ prüfen und begründet entscheiden (Art. 16/17 DSA).'],
      }),
      to,
      idempotencyKey: `report-admin-${caseNumber}`,
    });
  } catch {
    /* alerting is best effort */
  }
}
