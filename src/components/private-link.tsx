'use client';
import { useEffect, useState } from 'react';
import { CustomerChat } from './customer-chat';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
import { useI18n } from './providers';
import { api, friendlyError } from '@/lib/api-client';
import { dateLabel } from '@/lib/utils';
type Managed = {
  id: string;
  business_name: string;
  slug: string;
  service_name: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  service_id: string;
  staff_id: string;
  booking_number?: string;
};
export function PrivateLink({ invite = false }: { invite?: boolean }) {
  const { t, locale } = useI18n(),
    router = useRouter();
  const [token, setToken] = useState(''),
    [booking, setBooking] = useState<Managed | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [date, setDate] = useState(''),
    [slots, setSlots] = useState<{ start: string; staff_id: string }[]>([]),
    [selected, setSelected] = useState(''),
    [reschedule, setReschedule] = useState(false),
    [accepted, setAccepted] = useState(false);
  useEffect(() => {
    const tok = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    setToken(tok);
    if (!tok) {
      setError(t.linkExpired);
      return;
    }
    if (!invite) {
      setBusy(true);
      api<Managed>('/api/public/manage', 'POST', { token: tok, action: 'view' })
        .then(setBooking)
        .catch((e) => setError(friendlyError(e, locale)))
        .finally(() => setBusy(false));
    }
  }, [invite, locale, t.linkExpired]);
  async function action(kind: string) {
    if (kind === 'cancel' && !confirm(t.cancelConfirm)) return;
    setBusy(true);
    setError('');
    try {
      if (invite) {
        const result = await api<{ business_id: string }>('/api/invitations/accept', 'POST', {
          token,
        });
        document.cookie = `slotdove-business=${result.business_id};path=/;SameSite=Lax`;
        setAccepted(true);
        router.push('/dashboard');
        router.refresh();
      } else {
        const result = await api<Managed>('/api/public/manage', 'POST', {
          token,
          action: kind,
          starts_at: selected || undefined,
        });
        setBooking(result);
        setReschedule(false);
      }
    } catch (e) {
      setError(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  async function loadSlots(value: string) {
    setDate(value);
    setSelected('');
    setSlots([]);
    if (!booking) return;
    setBusy(true);
    try {
      const result = await api<{ slots: { start: string; staff_id: string }[] }>(
        `/api/public/${booking.slug}?service=${booking.service_id}&staff=${booking.staff_id}&date=${value}`,
      );
      setSlots(result.slots);
    } catch (e) {
      setError(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <Brand />
      <h1>{invite ? t.invitation : t.manage}</h1>
      <div className="panel panel-body stack">
        {invite ? (
          <>
            <p>
              {locale === 'de'
                ? 'Melde dich mit der eingeladenen, bestätigten E-Mail-Adresse an und nimm anschließend die Einladung an.'
                : 'Sign in with the invited, verified email address, then accept your invitation.'}
            </p>
            <Button variant="outline" asChild>
              <Link href="/login" target="_blank">
                {t.login}
              </Link>
            </Button>
            <Button disabled={busy || !token || accepted} onClick={() => action('accept')}>
              {busy ? t.loading : locale === 'de' ? 'Einladung annehmen' : 'Accept invitation'}
              <ArrowRight size={14} />
            </Button>
          </>
        ) : booking ? (
          <>
            <span className="badge badge-purple">{booking.business_name}</span>
            <h2>{booking.service_name}</h2>
            {booking.booking_number && (
              <span className="booking-number">
                {locale === 'de' ? 'Buchungsnummer' : 'Booking no.'} {booking.booking_number}
              </span>
            )}
            <div className="row">
              <Clock3 size={15} />
              {dateLabel(booking.starts_at, booking.timezone, locale)}
            </div>
            <p>
              {booking.timezone} · {t[booking.status as 'confirmed'] || booking.status}
            </p>
            {['confirmed', 'pending'].includes(booking.status) && (
              <div className="row wrap">
                <Button
                  variant="outline"
                  onClick={() => setReschedule(!reschedule)}
                  disabled={busy}
                >
                  {t.reschedule}
                </Button>
                <Button variant="danger" onClick={() => action('cancel')} disabled={busy}>
                  {t.cancelled}
                </Button>
              </div>
            )}
            {reschedule && (
              <div className="stack">
                <label htmlFor="date">{t.chooseDate}</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => loadSlots(e.target.value)}
                />
                <div className="slot-grid" style={{ margin: 0 }}>
                  {slots.map((s) => (
                    <button
                      className={`slot ${selected === s.start ? 'selected' : ''}`}
                      key={s.start}
                      onClick={() => setSelected(s.start)}
                    >
                      {new Intl.DateTimeFormat(locale, {
                        timeStyle: 'short',
                        timeZone: booking.timezone,
                      }).format(new Date(s.start))}
                    </button>
                  ))}
                </div>
                {date && !slots.length && !busy && <p>{t.noSlots}</p>}
                <Button disabled={!selected || busy} onClick={() => action('reschedule')}>
                  {t.reschedule}
                </Button>
              </div>
            )}
            {token && <CustomerChat token={token} business={booking.business_name} />}
          </>
        ) : busy ? (
          <p>{t.loading}</p>
        ) : null}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
