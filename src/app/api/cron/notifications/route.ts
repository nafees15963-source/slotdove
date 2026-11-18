import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { appointmentEmail, sendEmail } from '@/lib/email';
import { json } from '@/lib/http';
import { dateLabel } from '@/lib/utils';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET,
    header = request.headers.get('authorization') || '';
  if (
    !secret ||
    Buffer.byteLength(header) !== Buffer.byteLength(`Bearer ${secret}`) ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(`Bearer ${secret}`))
  )
    return json({ error: 'FORBIDDEN' }, 403);
  const db = supabaseAdmin();
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    return json(
      {
        status: 'unavailable',
        reason: 'Configure Resend and a verified sender before enabling the worker.',
      },
      503,
    );
  const { data: jobs, error } = await db.rpc('claim_notifications', { p_limit: 3 });
  if (error) return json({ error: 'QUEUE_UNAVAILABLE' }, 503);
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
        e instanceof Error && /^EMAIL_PROVIDER_\d+$/.test(e.message)
          ? e.message
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
  return json({ accepted, failed });
}
