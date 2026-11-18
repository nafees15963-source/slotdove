'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Clock3, Copy, Globe2, MapPin, ShieldCheck, Download, Mail, Phone, Sun, Sunset, Moon, User } from 'lucide-react';
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
import { CustomerChat } from './customer-chat';
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
  booking_number?: string;
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
  const dl = locale === 'de';
  const steps = [dl ? 'Leistung' : 'Service', dl ? 'Termin' : 'Time', dl ? 'Daten' : 'Details', dl ? 'Prüfen' : 'Review'];
  const today = b ? formatInTimeZone(new Date(), b.timezone, 'yyyy-MM-dd') : '';
  const days = b
    ? Array.from({ length: 21 }, (_, n) => {
        const d = new Date(today + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
      })
    : [];
  const hourOf = (iso: string) => Number(formatInTimeZone(iso, b?.timezone || 'UTC', 'H'));
  const groups = [
    { key: 'am', label: dl ? 'Vormittag' : 'Morning', Icon: Sun, list: slots.filter((x) => hourOf(x.start) < 12) },
    { key: 'pm', label: dl ? 'Nachmittag' : 'Afternoon', Icon: Sunset, list: slots.filter((x) => hourOf(x.start) >= 12 && hourOf(x.start) < 17) },
    { key: 'ev', label: dl ? 'Abend' : 'Evening', Icon: Moon, list: slots.filter((x) => hourOf(x.start) >= 17) },
  ].filter((g) => g.list.length);
  const staffFor = (sid: string) => catalog?.assignments.filter((a) => a.service_id === sid).map((a) => catalog.staff.find((st) => st.id === a.staff_id)).filter(Boolean) as { id: string; name: string }[];
  const time = (iso: string) => new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: b?.timezone }).format(new Date(iso));
  const accent = b?.brand_color || '#6a46f5';
  const validDetails = details.name.trim().length >= 2 && /.+@.+\..+/.test(details.email) && details.consent;
  return (
    <div className="bk" style={{ ['--accent' as string]: accent }}>
      <header className="bk-top">
        <Brand />
        <Preferences />
      </header>
      {loading ? (
        <div className="bk-center">
          <span className="spinner purple" />
          <p>{t.loading}</p>
        </div>
      ) : !catalog || !b ? (
        <div className="bk-center">
          <Globe2 size={40} className="purple" />
          <h1>{t.unavailable}</h1>
          <p>{error || t.unavailableText}</p>
          <Button variant="outline" asChild>
            <Link href="/">{t.back}</Link>
          </Button>
        </div>
      ) : (
        <main className="bk-main">
          <section className="bk-hero">
            <div className="bk-logo">
              {b.logo_path ? (
                <Image width={72} height={72} alt="" src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${b.logo_path}`} />
              ) : (
                <span>{b.name.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <h1>{b.name}</h1>
              {b.description && <p>{b.description}</p>}
              <div className="bk-meta">
                {b.address && (
                  <span>
                    <MapPin size={14} /> {b.address}
                  </span>
                )}
                {b.phone && (
                  <a href={`tel:${b.phone}`}>
                    <Phone size={14} /> {b.phone}
                  </a>
                )}
                <a href={`mailto:${b.email}`}>
                  <Mail size={14} /> {b.email}
                </a>
              </div>
            </div>
            {b.is_demo && <span className="badge badge-amber">{t.demo}</span>}
          </section>
          {!receipt && (
            <ol className="bk-progress" aria-label={dl ? 'Fortschritt' : 'Progress'}>
              {steps.map((label, i) => (
                <li key={label} className={i < step ? 'done' : i === step ? 'on' : ''}>
                  <button disabled={i > step} onClick={() => i < step && setStep(i)}>
                    <span>{i < step ? <Check size={12} /> : i + 1}</span>
                    <em>{label}</em>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className={`bk-grid ${receipt ? 'done' : ''}`}>
            <section className="bk-card" key={receipt ? 'done' : step}>
              {receipt ? (
                <div className="bk-success">
                  <div className="bk-check">
                    <Check size={34} />
                  </div>
                  <h2>{receipt.status === 'pending' ? (dl ? 'Anfrage gesendet! 📨' : 'Request sent! 📨') : dl ? 'Gebucht! 🎉' : 'Booked! 🎉'}</h2>
                  <p className="muted">{receipt.status === 'pending' ? (dl ? 'Das Unternehmen bestätigt deine Anfrage in Kürze.' : 'The business will confirm your request shortly.') : dl ? 'Wir freuen uns auf dich!' : 'We look forward to seeing you!'}</p>
                  {receipt.booking_number && (
                    <button
                      className="bk-number"
                      onClick={async () => {
                        await navigator.clipboard.writeText(receipt.booking_number!);
                        toast.success(t.copied);
                      }}
                    >
                      <small>{dl ? 'Deine Buchungsnummer' : 'Your booking number'}</small>
                      <strong>{receipt.booking_number}</strong>
                      <span>
                        <Copy size={12} /> {dl ? 'Kopieren' : 'Copy'}
                      </span>
                    </button>
                  )}
                  <div className="bk-summary">
                    <div>
                      <small>{t.service}</small>
                      <strong>{receipt.service_name}</strong>
                    </div>
                    <div>
                      <small>{dl ? 'Wann' : 'When'}</small>
                      <strong>{dateLabel(receipt.starts_at, b.timezone, locale)}</strong>
                    </div>
                  </div>
                  <div className="row wrap" style={{ justifyContent: 'center' }}>
                    <Button variant="outline" onClick={download}>
                      <Download size={15} /> {dl ? 'In Kalender speichern' : 'Add to calendar'}
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={receipt.management_url}>{dl ? 'Termin verwalten' : 'Manage booking'}</a>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await navigator.clipboard.writeText(receipt.management_url);
                        toast.success(t.copied);
                      }}
                    >
                      <Copy size={14} /> {dl ? 'Privaten Link kopieren' : 'Copy private link'}
                    </Button>
                  </div>
                  <p className="bk-hint">
                    <ShieldCheck size={14} />{' '}
                    {receipt.email_status === 'queued'
                      ? dl
                        ? 'Du bekommst gleich eine Bestätigung per E-Mail. Bewahre deinen privaten Link auf, um den Termin zu ändern oder dem Unternehmen zu schreiben.'
                        : 'A confirmation email is on its way. Keep your private link to change the appointment or message the business.'
                      : dl
                        ? 'Bewahre deinen privaten Link und die Buchungsnummer auf – damit kannst du den Termin ändern oder dem Unternehmen schreiben.'
                        : 'Keep your private link and booking number to change the appointment or message the business.'}
                  </p>
                  <CustomerChat token={token} business={b.name} />
                </div>
              ) : step === 0 ? (
                <>
                  <h2>{dl ? 'Was möchtest du buchen?' : 'What would you like to book?'}</h2>
                  {catalog.services.length ? (
                    <div className="bk-services">
                      {catalog.services.map((sv) => (
                        <button
                          key={sv.id}
                          className={`bk-service ${service?.id === sv.id ? 'on' : ''}`}
                          onClick={() => {
                            setService(sv);
                            setStaff('');
                            setStep(1);
                          }}
                        >
                          <span className="bk-dot" style={{ background: (sv as PublicService & { color?: string }).color || accent }} />
                          <span className="grow">
                            <strong>{sv.name}</strong>
                            {sv.description && <small>{sv.description}</small>}
                            <em>
                              <Clock3 size={13} /> {sv.duration_minutes} {t.minutes}
                            </em>
                          </span>
                          <b>{sv.price_cents ? money(sv.price_cents, b.currency, locale) : dl ? 'kostenlos' : 'free'}</b>
                          <ArrowRight size={16} className="muted" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{t.noServices}</p>
                  )}
                </>
              ) : step === 1 && service ? (
                <>
                  <h2>{dl ? 'Wann passt es dir?' : 'When suits you?'}</h2>
                  {staffFor(service.id).length > 1 && (
                    <div className="bk-staff">
                      <button className={`chip ${!staff ? 'on' : ''}`} onClick={() => setStaff('')}>
                        {dl ? 'Egal wer' : 'Anyone'}
                      </button>
                      {staffFor(service.id).map((st) => (
                        <button key={st.id} className={`chip ${staff === st.id ? 'on' : ''}`} onClick={() => setStaff(st.id)}>
                          <User size={13} /> {st.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="bk-days" role="listbox" aria-label={t.chooseDate}>
                    {days.map((d) => {
                      const dt = new Date(d + 'T12:00:00Z');
                      return (
                        <button key={d} role="option" aria-selected={date === d} className={`bk-day ${date === d ? 'on' : ''}`} onClick={() => setDate(d)}>
                          <small>{d === today ? (dl ? 'Heute' : 'Today') : new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(dt)}</small>
                          <strong>{dt.getUTCDate()}</strong>
                          <small>{new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(dt)}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="bk-slots">
                    {busy ? (
                      <div className="bk-loading">
                        {Array.from({ length: 8 }, (_, i) => (
                          <span className="skeleton" key={i} />
                        ))}
                      </div>
                    ) : groups.length ? (
                      groups.map(({ key, label, Icon, list }) => (
                        <div key={key} className="bk-slot-group">
                          <div className="bk-slot-label">
                            <Icon size={14} /> {label}
                          </div>
                          <div className="bk-slot-list">
                            {list.map((x) => (
                              <button
                                key={x.start}
                                className={`bk-slot ${selected?.start === x.start ? 'on' : ''}`}
                                onClick={() => {
                                  setSelected(x);
                                  setStep(2);
                                }}
                              >
                                {time(x.start)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bk-empty">
                        <p>{t.noSlots}</p>
                        <small className="muted">{dl ? 'Wähle einen anderen Tag oben.' : 'Pick another day above.'}</small>
                      </div>
                    )}
                  </div>
                  <button className="bk-back" onClick={() => setStep(0)}>
                    <ArrowLeft size={14} /> {t.back}
                  </button>
                </>
              ) : step === 2 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validDetails) setStep(3);
                  }}
                >
                  <h2>{t.yourDetails}</h2>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="bk-name">{dl ? 'Vor- und Nachname' : 'Full name'}</label>
                      <input id="bk-name" autoComplete="name" required minLength={2} maxLength={100} value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="bk-email">{t.email}</label>
                      <input id="bk-email" type="email" autoComplete="email" required value={details.email} onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="bk-phone">{t.phone}</label>
                      <input id="bk-phone" type="tel" autoComplete="tel" maxLength={30} value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))} />
                    </div>
                    <div className="field full">
                      <label htmlFor="bk-notes">{dl ? 'Nachricht an das Unternehmen (optional)' : 'Message to the business (optional)'}</label>
                      <textarea id="bk-notes" maxLength={1000} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))} />
                    </div>
                    <label className="check-label full">
                      <input type="checkbox" checked={details.consent} onChange={(e) => setDetails((d) => ({ ...d, consent: e.target.checked }))} required />
                      <span>
                        {t.consent} <Link href="/privacy" target="_blank">{t.privacy}</Link>
                      </span>
                    </label>
                  </div>
                  <div className="bk-actions">
                    <button type="button" className="bk-back" onClick={() => setStep(1)}>
                      <ArrowLeft size={14} /> {t.back}
                    </button>
                    <Button disabled={!validDetails}>
                      {t.next} <ArrowRight size={15} />
                    </Button>
                  </div>
                </form>
              ) : step === 3 && service && selected ? (
                <>
                  <h2>{dl ? 'Alles richtig?' : 'All correct?'}</h2>
                  <div className="bk-summary big">
                    <div>
                      <small>{t.service}</small>
                      <strong>{service.name}</strong>
                      <span className="muted">
                        {service.duration_minutes} {t.minutes} · {money(service.price_cents, b.currency, locale)}
                      </span>
                    </div>
                    <div>
                      <small>{dl ? 'Wann' : 'When'}</small>
                      <strong>{dateLabel(selected.start, b.timezone, locale)}</strong>
                      <span className="muted">
                        {dl ? 'bei' : 'with'} {catalog.staff.find((st) => st.id === selected.staff_id)?.name}
                      </span>
                    </div>
                    <div>
                      <small>{dl ? 'Für' : 'For'}</small>
                      <strong>{details.name}</strong>
                      <span className="muted">{[details.email, details.phone].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                  <p className="muted bk-pay">{t.paymentNote}</p>
                  {error && (
                    <div className="notice notice-error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="bk-actions">
                    <button className="bk-back" onClick={() => setStep(2)}>
                      <ArrowLeft size={14} /> {t.back}
                    </button>
                    <Button size="lg" onClick={book} disabled={busy}>
                      {busy ? <span className="spinner" /> : <Check size={16} />}
                      {dl ? 'Verbindlich buchen' : 'Confirm booking'}
                    </Button>
                  </div>
                </>
              ) : null}
              {error && step !== 3 && !receipt && (
                <div className="notice notice-error" role="alert" style={{ marginTop: 14 }}>
                  {error}
                </div>
              )}
            </section>
            {!receipt && (
              <aside className="bk-side">
                <strong>{dl ? 'Deine Auswahl' : 'Your selection'}</strong>
                <div className={`bk-sel ${service ? 'set' : ''}`}>
                  <small>{t.service}</small>
                  <span>{service ? `${service.name} · ${service.duration_minutes} ${t.minutes}` : '—'}</span>
                </div>
                <div className={`bk-sel ${selected ? 'set' : ''}`}>
                  <small>{dl ? 'Termin' : 'Time'}</small>
                  <span>{selected ? dateLabel(selected.start, b.timezone, locale) : '—'}</span>
                </div>
                {service && (
                  <div className="bk-total">
                    <small>{dl ? 'Preis' : 'Price'}</small>
                    <strong>{money(service.price_cents, b.currency, locale)}</strong>
                  </div>
                )}
                <p className="bk-hint">
                  <ShieldCheck size={14} /> {dl ? 'Kostenlos stornierbar über deinen privaten Link.' : 'Free cancellation via your private link.'}
                </p>
              </aside>
            )}
          </div>
          <footer className="bk-foot">
            Powered by <Link href="/">Slotdove</Link> · <Link href="/privacy">{t.privacy}</Link>
          </footer>
        </main>
      )}
    </div>
  );
}
