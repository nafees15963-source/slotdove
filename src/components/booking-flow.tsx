'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Globe2,
  MapPin,
  ShieldCheck,
  Download,
  Mail,
} from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { Button } from './ui/button';
import { useI18n } from './providers';
import { en } from '@/lib/i18n/en';
import { de } from '@/lib/i18n/de';
import { api, friendlyError } from '@/lib/api-client';
import { money, dateLabel } from '@/lib/utils';
import { calendarFile } from '@/lib/scheduling/engine';
type PublicBusiness = {
  logo_path: string | null;
  id: string;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  currency: string;
  locale: 'en' | 'de';
  address: string;
  phone: string;
  email: string;
  brand_color: string;
  is_demo: boolean;
};
type PublicService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
};
type Catalog = {
  business: PublicBusiness;
  services: PublicService[];
  staff: { id: string; name: string }[];
  assignments: { service_id: string; staff_id: string }[];
};
type Slot = { start: string; staff_id: string };
type Receipt = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  management_url: string;
  email_status: string;
};
function clientToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
export function BookingFlow({ slug }: { slug: string }) {
  const pref = useI18n();
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(''),
    [step, setStep] = useState(0),
    [service, setService] = useState<PublicService | null>(null),
    [staff, setStaff] = useState(''),
    [date, setDate] = useState(''),
    [slots, setSlots] = useState<Slot[]>([]),
    [selected, setSelected] = useState<Slot | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [details, setDetails] = useState({ name: '', email: '', phone: '', notes: '', consent: false }),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [requestId, setRequestId] = useState(''),
    [token, setToken] = useState('');
  const locale = catalog?.business.locale || pref.locale,
    t = locale === 'de' ? de : en,
    b = catalog?.business;
  useEffect(() => {
    let active = true;
    api<Catalog>(`/api/public/${slug}`)
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        setDate(formatInTimeZone(new Date(), data.business.timezone, 'yyyy-MM-dd'));
      })
      .catch((e) => {
        if (active) setError(friendlyError(e, pref.locale));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    setRequestId(crypto.randomUUID());
    setToken(clientToken());
    return () => {
      active = false;
    };
  }, [slug, pref.locale]);
  useEffect(() => {
    if (!service || !date) return;
    let active = true;
    setBusy(true);
    setSelected(null);
    setSlots([]);
    setError('');
    api<{ slots: Slot[] }>(
      `/api/public/${slug}?service=${service.id}&date=${date}${staff ? `&staff=${staff}` : ''}`,
    )
      .then((data) => {
        if (active) setSlots(data.slots);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e, locale));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [service, date, staff, slug, locale]);
  async function book() {
    if (!b || !service || !selected) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<Receipt>('/api/public/book', 'POST', {
        business_id: b.id,
        service_id: service.id,
        staff_id: selected.staff_id,
        starts_at: selected.start,
        ...details,
        idempotency_key: requestId,
        management_token: token,
        website: '',
      });
      setReceipt(result);
      setStep(4);
    } catch (e) {
      setError(friendlyError(e, locale));
      if (e instanceof Error && e.message === 'SLOT_UNAVAILABLE') {
        setSlots((s) => s.filter((x) => x.start !== selected.start));
        setSelected(null);
        setStep(1);
      }
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!receipt || !b) return;
    const url = URL.createObjectURL(
      new Blob([calendarFile(receipt, b)], { type: 'text/calendar' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slotdove-appointment.ics';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="booking-layout">
      <div className="booking-top">
        <Brand />
        <Preferences />
      </div>
      {loading ? (
        <div className="error-page">
          <span className="spinner purple" style={{ margin: 'auto' }} />
          <p>{t.loading}</p>
        </div>
      ) : !catalog ? (
        <div className="error-page">
          <Globe2 size={38} className="purple" style={{ margin: 'auto' }} />
          <h1>{t.unavailable}</h1>
          <p>{error || t.unavailableText}</p>
          <Button variant="outline" asChild>
            <Link href="/">{t.back}</Link>
          </Button>
        </div>
      ) : (
        <div className="booking-shell">
          <aside className="booking-aside">
            <div className="booking-business-icon" style={{ color: b!.brand_color }}>
              {b!.logo_path ? (
                <Image
                  alt={b!.name}
                  width={62}
                  height={62}
                  unoptimized
                  style={{ objectFit: 'contain', borderRadius: 14 }}
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${b!.logo_path}`}
                />
              ) : (
                b!.name.slice(0, 1)
              )}
            </div>
            {b!.is_demo && (
              <span className="badge badge-amber" style={{ marginBottom: 14 }}>
                {t.demo}
              </span>
            )}
            <h1>{b!.name}</h1>
            <p>{b!.description}</p>
            <div className="booking-details">
              {b!.address && (
                <div className="row">
                  <MapPin size={15} />
                  {b!.address}
                </div>
              )}
              <div className="row">
                <Globe2 size={15} />
                {b!.timezone}
              </div>
              {service && (
                <>
                  <div className="row">
                    <Clock3 size={15} />
                    {service.duration_minutes} {t.minutes}
                  </div>
                  <strong>{money(service.price_cents, b!.currency, locale)}</strong>
                  <small>{t.paymentNote}</small>
                </>
              )}
              <a className="row" href={`mailto:${b!.email}`}>
                <Mail size={15} />
                {b!.email}
              </a>
            </div>
            <div
              style={{
                borderTop: '1px solid var(--line)',
                marginTop: 35,
                paddingTop: 20,
                fontSize: 10,
                color: 'var(--muted)',
              }}
            >
              <ShieldCheck size={13} style={{ display: 'inline', marginRight: 6 }} />
              {t.tagline}
            </div>
          </aside>
          <main className="booking-main">
            <div className="booking-progress">
              {[0, 1, 2, 3].map((i) => (
                <span className={step >= i ? 'done' : ''} key={i} />
              ))}
            </div>
            {step > 0 && step < 4 && (
              <Button
                variant="ghost"
                size="sm"
                style={{ marginTop: 20, marginLeft: -10 }}
                onClick={() => {
                  setStep(step - 1);
                  setError('');
                }}
              >
                <ArrowLeft size={13} />
                {t.back}
              </Button>
            )}
            {step === 0 && (
              <>
                <h2>{t.selectService}</h2>
                {catalog.services.map((s) => (
                  <button
                    className="service-choice"
                    key={s.id}
                    onClick={() => {
                      setService(s);
                      setStaff('');
                      setStep(1);
                    }}
                  >
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.description}</p>
                      <p style={{ marginTop: 8 }}>
                        {s.duration_minutes} {t.minutes} ·{' '}
                        {money(s.price_cents, b!.currency, locale)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="purple" />
                  </button>
                ))}
                {!catalog.services.length && <p>{t.noServices}</p>}
              </>
            )}
            {step === 1 && (
              <>
                <h2>{t.selectTime}</h2>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="staff">{t.employee}</label>
                    <select id="staff" value={staff} onChange={(e) => setStaff(e.target.value)}>
                      <option value="">{t.anyStaff}</option>
                      {catalog.staff
                        .filter((s) =>
                          catalog.assignments.some(
                            (a) => a.service_id === service?.id && a.staff_id === s.id,
                          ),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="date">{t.chooseDate}</label>
                    <input
                      id="date"
                      type="date"
                      value={date}
                      min={formatInTimeZone(new Date(), b!.timezone, 'yyyy-MM-dd')}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                {busy ? (
                  <div className="empty">
                    <span className="spinner purple" />
                  </div>
                ) : slots.length ? (
                  <div className="slot-grid">
                    {slots.map((s) => (
                      <button
                        key={s.start}
                        className={`slot ${selected?.start === s.start ? 'selected' : ''}`}
                        onClick={() => setSelected(s)}
                      >
                        {formatInTimeZone(s.start, b!.timezone, 'HH:mm')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="notice" style={{ margin: '24px 0' }}>
                    {t.noSlots}
                  </div>
                )}
                <div className="spread">
                  <small>{b!.timezone}</small>
                  <Button disabled={!selected || busy} onClick={() => setStep(2)}>
                    {t.next}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2>{t.yourDetails}</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(3);
                  }}
                  className="stack"
                >
                  {(['name', 'email', 'phone'] as const).map((k) => (
                    <div className="field" key={k}>
                      <label htmlFor={k}>{t[k]}</label>
                      <input
                        id={k}
                        name={k}
                        type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'}
                        required={k !== 'phone'}
                        minLength={k === 'name' ? 2 : undefined}
                        maxLength={k === 'phone' ? 30 : 100}
                        value={details[k]}
                        autoComplete={k === 'phone' ? 'tel' : k}
                        onChange={(e) => setDetails((d) => ({ ...d, [k]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="field">
                    <label htmlFor="notes">{t.notes}</label>
                    <textarea
                      id="notes"
                      value={details.notes}
                      maxLength={1000}
                      onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      required
                      checked={details.consent}
                      onChange={(e) => setDetails((d) => ({ ...d, consent: e.target.checked }))}
                    />
                    {t.consent}
                  </label>
                  <Button>
                    {t.review}
                    <ArrowRight size={14} />
                  </Button>
                </form>
              </>
            )}
            {step === 3 && (
              <>
                <h2>{t.review}</h2>
                <div className="booking-review">
                  <h3>{service?.name}</h3>
                  <div className="row">
                    <Clock3 size={15} />
                    {selected && dateLabel(selected.start, b!.timezone, locale)}
                  </div>
                  <small>
                    {b!.timezone} · {catalog.staff.find((s) => s.id === selected?.staff_id)?.name}
                  </small>
                  <div>
                    <strong>{details.name}</strong>
                    <p>{details.email}</p>
                  </div>
                  <strong>{money(service?.price_cents || 0, b!.currency, locale)}</strong>
                  <small>{t.paymentNote}</small>
                </div>
                <Button style={{ width: '100%' }} disabled={busy} onClick={book}>
                  {busy ? <span className="spinner" /> : <Check size={16} />} {t.saveBooking}
                </Button>
              </>
            )}
            {step === 4 && receipt && (
              <>
                <div className="success-check">
                  <CheckCircle2 size={30} />
                </div>
                <h2>{receipt.status === 'pending' ? t.bookingPending : t.booked}</h2>
                <p>{t.bookingSuccess}</p>
                <div className="booking-review" style={{ marginTop: 25 }}>
                  <strong>{receipt.service_name}</strong>
                  <span>{dateLabel(receipt.starts_at, b!.timezone, locale)}</span>
                  <small>{b!.timezone}</small>
                </div>
                <div className="stack">
                  <Button asChild>
                    <a href={receipt.management_url}>
                      {t.manage}
                      <ArrowUpRightIcon />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(receipt.management_url);
                      toast.success(t.copied);
                    }}
                  >
                    <Copy size={14} />
                    {t.copyLink}
                  </Button>
                  <Button variant="outline" onClick={download}>
                    <Download size={14} />
                    {t.download}
                  </Button>
                  <small>
                    {receipt.email_status === 'unavailable'
                      ? t.notificationUnavailable
                      : locale === 'de'
                        ? 'Eine Bestätigung wurde zum Versand vorgemerkt.'
                        : 'A confirmation has been queued for delivery.'}
                  </small>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="notice notice-error" style={{ marginTop: 20 }}>
                {error}
              </p>
            )}
          </main>
        </div>
      )}
      <div className="footer-logo">
        Powered by Slotdove · <Link href="/privacy">{t.privacy}</Link>
      </div>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}
