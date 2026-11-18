import 'server-only';
import { after } from 'next/server';
import { supabaseAdmin } from './supabase/admin';
import { appointmentEmail, emailConfigured, noticeEmail, sendEmail } from './email';
import { dateLabel } from './utils';
/** Sends due appointment emails from the queue. Safe to run concurrently:
 * jobs are claimed with row locks and Resend idempotency keys. */
export async function processQueue(limit = 10) {
  if (!emailConfigured()) return { accepted: 0, failed: 0, skipped: 'not_configured' as const };
  const db = supabaseAdmin();
  const { data: jobs, error } = await db.rpc('claim_notifications', { p_limit: limit });
  if (error) throw new Error('QUEUE_UNAVAILABLE');
  let accepted = 0,
    failed = 0;
  for (const job of jobs || []) {
    try {
      const { data: booking, error: be } = await db
        .from('bookings')
        .select(
          '*,businesses!inner(name,timezone,locale,address,is_demo,status,notifications_enabled),customers!inner(email)',
        )
        .eq('id', job.booking_id)
        .single();
      if (be || !booking) throw new Error('BOOKING_MISSING');
      if (
        !booking.customers.email ||
        booking.is_sample ||
        booking.businesses.is_demo ||
        !booking.businesses.notifications_enabled ||
        booking.businesses.status !== 'active' ||
        (job.kind === 'reminder' && booking.status !== 'confirmed') ||
        (['confirmation', 'reschedule'].includes(job.kind) &&
          ['cancelled', 'completed', 'no_show'].includes(booking.status))
      ) {
        await db
          .from('notification_jobs')
          .update({ status: 'suppressed', locked_until: null })
          .eq('id', job.id);
        continue;
      }
      const email = appointmentEmail({
        kind: job.kind,
        locale: booking.businesses.locale,
        business: booking.businesses.name,
        service: booking.service_name,
        date: dateLabel(booking.starts_at, booking.businesses.timezone, booking.businesses.locale),
        timezone: booking.businesses.timezone,
        status: booking.status,
        address: booking.businesses.address,
        bookingNumber: booking.booking_number,
      });
      const result = await sendEmail({
        ...email,
        to: booking.customers.email,
        idempotencyKey: job.id,
      });
      const { error: saveError } = await db
        .from('notification_jobs')
        .update({
          status: result.state,
          provider_id: result.state === 'accepted' ? result.id : null,
          last_error: null,
          locked_until: null,
        })
        .eq('id', job.id);
      if (saveError) throw new Error('STATUS_UPDATE_FAILED');
      if (result.state === 'accepted') accepted++;
    } catch (e) {
      failed++;
      const safe =
        e instanceof Error && /^EMAIL_PROVIDER_\d+/.test(e.message)
          ? e.message.slice(0, 200)
          : 'DELIVERY_FAILED';
      await db
        .from('notification_jobs')
        .update({
          status: 'failed',
          last_error: safe,
          scheduled_at: new Date(
            Date.now() + Math.min(60, 2 ** job.attempts) * 60000,
          ).toISOString(),
          locked_until: null,
        })
        .eq('id', job.id);
    }
  }
  return { accepted, failed };
}
/** Remembers the public URL so the database scheduler can reach this app. */
export async function registerAppUrl(request?: Request) {
  try {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = configured?.startsWith('https://') ? configured : request ? new URL(request.url).origin : '';
    if (!origin.startsWith('https://')) return;
    await supabaseAdmin().rpc('set_app_url', { p_url: origin.replace(/\/$/, '') });
  } catch {
    /* best effort */
  }
}
/** After the response is sent: deliver new emails right away instead of waiting for the scheduler. */
export function sendSoon(request: Request) {
  after(async () => {
    await registerAppUrl(request);
    try {
      // Give the database trigger a moment to enqueue the job.
      await new Promise((r) => setTimeout(r, 300));
      await processQueue(5);
    } catch {
      /* the scheduler retries */
    }
  });
}
function siteUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured?.startsWith('http') ? configured.replace(/\/$/, '') : request ? new URL(request.url).origin : '';
}
/** Tells the business owner about a new online booking. */
export function notifyOwner(request: Request, businessId: string, bookingNumber: string | undefined, customer: string, startsAt: string) {
  after(async () => {
    if (!emailConfigured()) return;
    try {
      const db = supabaseAdmin();
      const { data: b } = await db.from('businesses').select('name,email,locale,timezone,notifications_enabled,is_demo').eq('id', businessId).single();
      if (!b?.email || !b.notifications_enabled || b.is_demo) return;
      const de = b.locale === 'de';
      const when = dateLabel(startsAt, b.timezone, b.locale);
      await sendEmail({
        ...noticeEmail({
          locale: b.locale,
          title: de ? `Neue Buchung: ${customer}` : `New booking: ${customer}`,
          lines: [de ? `${customer} hat online gebucht.` : `${customer} booked online.`, `${de ? 'Wann' : 'When'}: ${when}`, `${de ? 'Buchungsnummer' : 'Booking number'}: ${bookingNumber || '—'}`],
          cta: { label: de ? 'Im Kalender ansehen' : 'Open calendar', url: `${siteUrl(request)}/dashboard/calendar` },
        }),
        to: b.email,
        idempotencyKey: `owner-${bookingNumber || startsAt}`,
      });
    } catch {
      /* optional */
    }
  });
}
/** Emails the business when the Slotdove team answers a support case. */
export function notifyTicketReply(request: Request, ticketId: string) {
  after(async () => {
    if (!emailConfigured()) return;
    try {
      const db = supabaseAdmin();
      const { data: t } = await db.from('support_tickets').select('case_number,subject,contact_email,businesses(email,locale)').eq('id', ticketId).single();
      const business = (t?.businesses as unknown as { email: string; locale: string } | null) || null;
      const to = t?.contact_email || business?.email;
      if (!t || !to) return;
      const de = (business?.locale || 'de') === 'de';
      await sendEmail({
        ...noticeEmail({
          locale: de ? 'de' : 'en',
          title: de ? `Antwort zu deinem Fall ${t.case_number}` : `Reply to your case ${t.case_number}`,
          lines: [de ? `Das Slotdove-Team hat auf deine Anfrage „${t.subject}“ geantwortet.` : `The Slotdove team replied to “${t.subject}”.`],
          cta: { label: de ? 'Antwort lesen' : 'Read reply', url: `${siteUrl(request)}/dashboard/support` },
        }),
        to,
        idempotencyKey: `ticket-${ticketId}-${Date.now()}`,
      });
    } catch {
      /* optional */
    }
  });
}
