'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dateDe, RELEASE_DEFAULT, safeSupportUrl, SUPPORT_DEFAULT, type Release, type Support } from '@/lib/release';
import { SupportCard } from '../support-card';
import { AccountPrivacy, HistoryPanel } from './trust-dialogs';
import { InfoTip } from '../tutorial';
import type { Visual } from '@/lib/tutorials';
import { industries, industryById } from '@/lib/industries';
import { computeInsights } from '@/lib/ai/insights';
import { Rich } from './assistant';
import { useEffect, useState } from 'react';
import { fromZonedTime } from 'date-fns-tz';
import { LogoUpload } from '../logo-upload';
import { ProfileForm } from '../profile-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  ArrowUpRight,
  Globe2,
  Mail,
  CalendarDays,
  Download,
} from 'lucide-react';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Heading, Empty } from './common';
import { Button } from '../ui/button';
import { api, friendlyError } from '@/lib/api-client';
import { dateLabel } from '@/lib/utils';
import { ActivityChart } from './overview';
export function Settings({ bookingOnly = false }: { bookingOnly?: boolean }) {
  const w = useWorkspace(),
    b = w.business,
    { t, locale } = useI18n(),
    router = useRouter();
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/businesses/${b.id}/settings`, 'POST', {
        ...b,
        ...f,
        auto_confirm: f.auto_confirm === 'on',
        published: f.published === 'on',
        notifications_enabled: bookingOnly
          ? b.notifications_enabled
          : f.notifications_enabled === 'on',
        reminder_hours: bookingOnly
          ? b.reminder_hours
          : [...(f.reminder_2 === 'on' ? [2] : []), ...(f.reminder_24 === 'on' ? [24] : [])],
      });
      toast.success(t.saved);
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  const de = locale === 'de';
  const tips: Record<string, [string, Visual]> = {
    min_notice_minutes: [de ? 'Wie kurzfristig Kunden online buchen dürfen. 120 = frühestens 2 Stunden vorher. Du selbst kannst intern jederzeit Termine eintragen.' : 'How short-notice customers may book online. 120 = at least 2 hours ahead. You can always add appointments internally.', 'slot-grid'],
    max_advance_days: [de ? 'Wie weit im Voraus online gebucht werden kann, z. B. 60 Tage.' : 'How far ahead customers can book, e.g. 60 days.', 'calendar'],
    slot_interval: [de ? 'Abstand der angebotenen Uhrzeiten. 15 = 9:00, 9:15, 9:30 … Für deine eigenen Einträge gilt das nicht.' : 'Spacing of offered times. 15 = 9:00, 9:15, 9:30 … Does not apply to your own entries.', 'slot-grid'],
    cancellation_hours: [de ? 'Bis wie viele Stunden vorher Kunden selbst absagen oder verschieben dürfen.' : 'Until how many hours before customers can cancel or move themselves.', 'calendar'],
  };
  const field = (name: string, label: string, type: string, value: string | number) => (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {tips[name] && <InfoTip text={tips[name][0]} visual={tips[name][1]} />}
      </label>
      <input
        name={name}
        id={name}
        type={type}
        defaultValue={value}
        required={name !== 'phone'}
        min={type === 'number' ? 0 : undefined}
      />
    </div>
  );
  return (
    <>
      <Heading
        title={bookingOnly ? t.booking : t.settings}
        description={bookingOnly ? `/b/${b.slug}` : t.businessName}
        action={
          bookingOnly && (
            <Button variant="outline" asChild>
              <Link href={`/b/${b.slug}`} target="_blank">
                {t.viewPage}
                <ArrowUpRight size={14} />
              </Link>
            </Button>
          )
        }
      />
      {bookingOnly && (
        <div className="panel panel-body" style={{ marginBottom: 24 }}>
          <div className="spread wrap">
            <div className="row">
              <div className="empty-icon" style={{ width: 45, height: 45, margin: 0 }}>
                <Globe2 size={22} />
              </div>
              <div>
                <strong>{b.name}</strong>
                <p style={{ fontSize: 11 }}>/b/{b.slug}</p>
              </div>
              <span className={`badge ${b.published ? 'badge-green' : ''}`}>
                {b.published ? t.published : t.draft}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(`${location.origin}/b/${b.slug}`);
                toast.success(t.copied);
              }}
            >
              <Copy size={13} />
              {t.copyLink}
            </Button>
          </div>
        </div>
      )}
      <LogoUpload />
      <form onSubmit={save}>
        <div className="split-settings">
          <div className="panel settings-section">
            <h3>{bookingOnly ? t.booking : t.stepBusiness}</h3>
            <div className="form-grid">
              {field('name', t.businessName, 'text', b.name)}
              {field('brand_color', t.brandColor, 'color', b.brand_color)}
              <div className="field full">
                <label htmlFor="description">{t.description}</label>
                <textarea
                  name="description"
                  id="description"
                  maxLength={1000}
                  defaultValue={b.description}
                />
              </div>
              {field('email', t.email, 'email', b.email)}
              {field('phone', t.phone, 'tel', b.phone)}
              <div className="field full">
                <label htmlFor="address">{t.address}</label>
                <input id="address" name="address" defaultValue={b.address} />
              </div>
              <div className="field">
                <label htmlFor="industry">{de ? 'Branche' : 'Industry'}</label>
                <select id="industry" name="industry" defaultValue={industryById(b.industry).id}>
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.emoji} {de ? i.de : i.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="locale">{t.language}</label>
                <select id="locale" name="locale" defaultValue={b.locale}>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="currency">{t.currency}</label>
                <select id="currency" name="currency" defaultValue={b.currency}>
                  {['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'INR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="stack" style={{ alignContent: 'start' }}>
            <div className="panel settings-section">
              <h3>{t.bookingSettings}</h3>
              <div className="form-grid">
                {!bookingOnly && (
                  <div className="field full">
                    <label htmlFor="timezone">{t.timezone}</label>
                    <select name="timezone" id="timezone" defaultValue={b.timezone}>
                      {['UTC', ...Intl.supportedValuesOf('timeZone')].map((z) => (
                        <option key={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(
                  <>
                    {field('min_notice_minutes', t.minNotice, 'number', b.min_notice_minutes)}
                    {field('max_advance_days', t.maxAdvance, 'number', b.max_advance_days)}
                    {field('slot_interval', t.interval, 'number', b.slot_interval)}
                    {field('cancellation_hours', t.cancellation, 'number', b.cancellation_hours)}
                    <label className="check-label full">
                      <input name="auto_confirm" type="checkbox" defaultChecked={b.auto_confirm} />
                      {t.autoConfirm}
                      <InfoTip text={de ? 'An: Online-Buchungen sind sofort fest. Aus: Du bestätigst jede Anfrage selbst.' : 'On: online bookings are confirmed instantly. Off: you confirm every request.'} visual="booking-form" />
                    </label>
                  </>
                )}
                <label className="check-label full">
                  <input name="published" type="checkbox" defaultChecked={b.published} />
                  {t.publish}
                </label>
              </div>
              <div className="form-actions">
                <Button disabled={busy}>
                  <Check size={14} />
                  {busy ? t.loading : t.save}
                </Button>
              </div>
            </div>
            {!bookingOnly && (
              <div className="panel settings-section">
                <h3>{t.notifications}</h3>
                <div className="stack">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      name="notifications_enabled"
                      defaultChecked={b.notifications_enabled}
                    />
                    {locale === 'de' ? 'Termin-E-Mails aktivieren' : 'Enable appointment emails'}
                  </label>
                  {[24, 2].map((h) => (
                    <label className="check-label" key={h}>
                      <input
                        type="checkbox"
                        name={`reminder_${h}`}
                        defaultChecked={b.reminder_hours.includes(h)}
                      />
                      {locale === 'de'
                        ? `${h} Stunden vorher erinnern`
                        : `Remind ${h} hours before`}
                    </label>
                  ))}
                  <small>
                    {locale === 'de'
                      ? 'Änderungen gelten für neue oder verschobene Termine. Versand erfordert einen eingerichteten Absender.'
                      : 'Changes apply to new or rescheduled appointments. Sending requires a configured sender.'}
                  </small>
                </div>
              </div>
            )}
            {!bookingOnly && (
              <div className="panel settings-section">
                <h3>{t.account}</h3>
                <div className="stack">
                  <Button variant="outline" asChild>
                    <Link href="/account/password">
                      {t.changePassword}
                      <ArrowUpRight size={14} />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/businesses/${b.id}/export`}>
                      <Download size={14} />
                      {t.privacyExport}
                    </a>
                  </Button>
                  <AccountPrivacy />
                  <p style={{ fontSize: 11 }}>{t.deleteCustomerHelp}</p>
                </div>
              </div>
            )}
            {!bookingOnly && ['owner', 'admin'].includes(w.role) && <HistoryPanel />}
            {bookingOnly && (
              <div className="panel settings-section">
                <h3>{locale === 'de' ? 'Auf deiner Website teilen' : 'Share on your website'}</h3>
                <p style={{ fontSize: 12, marginBottom: 18 }}>
                  {locale === 'de'
                    ? 'Füge diesen Buchungsbutton in deine Website ein. Er öffnet deine geschützte Buchungsseite in einem neuen Tab.'
                    : 'Add this booking button to your website. It opens your booking page in a new tab.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `<a href="${location.origin}/b/${b.slug}" target="_blank" rel="noopener">${locale === 'de' ? 'Termin buchen' : 'Book an appointment'}</a>`,
                    );
                    toast.success(t.copied);
                  }}
                >
                  <Copy size={14} />
                  {locale === 'de' ? 'HTML kopieren' : 'Copy HTML'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>
      {!bookingOnly && (
        <div style={{ marginTop: 24, maxWidth: 500 }}>
          <ProfileForm />
        </div>
      )}
    </>
  );
}
export function Analytics() {
  const w = useWorkspace(),
    { t, locale } = useI18n();
  const [stats, setStats] = useState(w.stats),
    [busy, setBusy] = useState(false),
    [explaining, setExplaining] = useState(false),
    [explanation, setExplanation] = useState('');
  return (
    <>
      <Heading title={t.analytics} description={t.thisMonth} />
      <form
        className="toolbar"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const from = fromZonedTime(
                String(f.get('from')) + 'T00:00:00',
                w.business.timezone,
              ).toISOString(),
              to = fromZonedTime(
                String(f.get('to')) + 'T23:59:59',
                w.business.timezone,
              ).toISOString();
            setStats(await api(`/api/businesses/${w.business.id}/analytics?from=${from}&to=${to}`));
          } catch (e) {
            toast.error(friendlyError(e, locale));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="row wrap">
          <div className="field">
            <label htmlFor="analytics-from">{t.from}</label>
            <input id="analytics-from" name="from" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="analytics-to">{t.to}</label>
            <input id="analytics-to" name="to" type="date" required />
          </div>
          <Button disabled={busy} variant="outline" style={{ alignSelf: 'end' }}>
            {t.view}
          </Button>
        </div>
        <small>
          {locale === 'de' ? 'Maximal 93 Tage je Auswertung' : 'Up to 93 days per report'}
        </small>
      </form>
      <div className="grid-4">
        {[
          { label: t.total, n: stats?.total },
          { label: t.completed, n: stats?.completed },
          { label: t.cancelled, n: stats?.cancelled },
          { label: t.no_show, n: stats?.no_show },
        ].map((v) => (
          <div className="panel metric" key={v.label}>
            <div className="metric-label">{v.label}</div>
            <div className="metric-value">{v.n ?? 0}</div>
            <span className="metric-foot">{t.thisMonth}</span>
          </div>
        ))}
      </div>
      {w.features.includes('assistant') && (
        <div className="panel panel-body insights-card" style={{ marginTop: 24 }}>
          <div className="spread wrap">
            <h3 className="panel-title">✨ {locale === 'de' ? 'KI-Einschätzung' : 'AI assessment'}</h3>
            <Button
              size="sm"
              className="btn-ai"
              disabled={explaining}
              onClick={async () => {
                setExplaining(true);
                try {
                  const r = await api<{ text?: string; fallback?: boolean }>('/api/ai', 'POST', {
                    business: w.business.id,
                    locale,
                    messages: [
                      {
                        role: 'user',
                        content:
                          locale === 'de'
                            ? 'Analysiere meine Zahlen: Vergleiche die letzten 30 Tage mit den 30 Tagen davor (Termine, Umsatz, No-Shows, beliebte Leistungen, starke und schwache Wochentage/Uhrzeiten) und gib mir 3 konkrete, umsetzbare Empfehlungen.'
                            : 'Analyse my numbers: compare the last 30 days with the 30 days before (appointments, revenue, no-shows, popular services, strong and weak weekdays/hours) and give me 3 concrete, actionable recommendations.',
                      },
                    ],
                  });
                  setExplanation(r.fallback || !r.text ? (locale === 'de' ? 'Die KI ist gerade nicht erreichbar. Unten siehst du die Offline-Einschätzung.' : 'AI is unavailable right now. See the offline assessment below.') : r.text);
                } catch {
                  setExplanation(locale === 'de' ? 'Die KI ist gerade nicht erreichbar.' : 'AI is unavailable right now.');
                } finally {
                  setExplaining(false);
                }
              }}
            >
              {explaining ? <span className="spinner" /> : '✨'} {locale === 'de' ? 'KI erklärt meine Zahlen' : 'AI explains my numbers'}
            </Button>
          </div>
          {explanation && (
            <div className="ai-explain fade-in">
              <Rich text={explanation} />
            </div>
          )}
          <div className="insight-list">
            {computeInsights(w).map((i) => (
              <div key={i.id} className={`insight ${i.tone}`}>
                <span>{locale === 'de' ? i.de : i.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="split-settings" style={{ marginTop: 24 }}>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.appointments}</h2>
          </div>
          <div className="panel-body">
            <ActivityChart />
            <small style={{ display: 'block', marginTop: 15 }}>
              {locale === 'de'
                ? 'Wochentage · geladener Kalenderzeitraum'
                : 'Weekdays · loaded calendar period'}
            </small>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.popular}</h2>
          </div>
          {stats?.popular?.length ? (
            <div className="panel-body stack">
              {stats.popular.map((p) => (
                <div key={p.name}>
                  <div className="spread" style={{ fontSize: 12, marginBottom: 10 }}>
                    <span>{p.name}</span>
                    <span>{p.count}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${(p.count / Math.max(stats.total, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </>
  );
}
export function Notifications() {
  const w = useWorkspace(),
    { t, locale } = useI18n();
  return (
    <>
      <Heading title={t.notifications} description={t.notificationState} />
      <div className="notice" style={{ marginBottom: 22 }}>
        <div className="row">
          <Mail size={15} />
          {locale === 'de'
            ? 'Versand benötigt einen verifizierten Absender und einen aktiven Zeitplan. „Accepted“ bedeutet vom Anbieter angenommen, nicht nachgewiesen zugestellt.'
            : 'Delivery requires a verified sender and an active schedule. “Accepted” means provider acceptance, not confirmed delivery.'}
        </div>
      </div>
      <div className="panel table-wrap">
        {w.notifications.length ? (
          <table>
            <thead>
              <tr>
                <th>{locale === 'de' ? 'Ereignis' : 'Event'}</th>
                <th>{t.date}</th>
                <th>{t.status}</th>
                <th>{locale === 'de' ? 'Versuche' : 'Attempts'}</th>
              </tr>
            </thead>
            <tbody>
              {w.notifications.map((n) => (
                <tr key={n.id}>
                  <td>{n.kind}</td>
                  <td>{dateLabel(n.scheduled_at, w.business.timezone, locale)}</td>
                  <td>
                    <span
                      className={`badge ${n.status === 'accepted' ? 'badge-green' : n.status === 'failed' ? 'badge-red' : ''}`}
                    >
                      {n.status}
                    </span>
                    {n.last_error && <small style={{ display: 'block' }}>{n.last_error}</small>}
                  </td>
                  <td>{n.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty description={t.noNotifications} />
        )}
      </div>
    </>
  );
}
export function Integrations() {
  const { t, locale } = useI18n();
  return (
    <>
      <Heading
        title={t.integrations}
        description={
          locale === 'de' ? 'Deine Werkzeuge. Klar verbunden.' : 'Your tools. Clearly connected.'
        }
      />
      <div className="grid-3">
        {[
          { name: 'Google Calendar', Icon: CalendarDays },
          { name: 'Microsoft Outlook', Icon: Mail },
        ].map(({ name, Icon }) => (
          <div className="panel panel-body" key={name}>
            <div className="service-icon">
              <Icon size={23} />
            </div>
            <h3>{name}</h3>
            <p style={{ fontSize: 12, margin: '14px 0 20px' }}>
              {locale === 'de'
                ? 'Die Synchronisation in beide Richtungen benötigt eine OAuth-Integration und ist noch nicht verfügbar.'
                : 'Two-way synchronization requires an OAuth integration and is not available yet.'}
            </p>
            <span className="badge">{t.notConnected}</span>
          </div>
        ))}
        <div className="panel panel-body">
          <div className="service-icon">
            <Download size={23} />
          </div>
          <h3>{t.calendarExport}</h3>
          <p style={{ fontSize: 12, margin: '14px 0 20px' }}>
            {locale === 'de'
              ? 'Öffne einen Termin und lade die .ics-Datei für deinen Kalender herunter.'
              : 'Open an appointment and download its .ics invitation for your calendar.'}
          </p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/appointments">
              {t.appointments}
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
export function Billing() {
  const w = useWorkspace(),
    { locale } = useI18n();
  const de = locale === 'de';
  const [cfg, setCfg] = useState<{ release: Release; support: Support }>({ release: RELEASE_DEFAULT, support: SUPPORT_DEFAULT });
  useEffect(() => {
    supabaseBrowser()
      .from('platform_settings')
      .select('key,value')
      .in('key', ['release', 'support'])
      .then(({ data }) => {
        const next = { release: RELEASE_DEFAULT, support: SUPPORT_DEFAULT };
        for (const row of data || []) {
          if (row.key === 'release') next.release = { ...RELEASE_DEFAULT, ...(row.value as Partial<Release>) };
          if (row.key === 'support') {
            const sp = { ...SUPPORT_DEFAULT, ...(row.value as Partial<Support>) };
            sp.url = safeSupportUrl(sp.url);
            sp.enabled = sp.enabled && !!sp.url;
            next.support = sp;
          }
        }
        setCfg(next);
      });
  }, []);
  const ownUntil = w.business.free_until && w.business.free_until > cfg.release.free_until ? w.business.free_until : cfg.release.free_until;
  const from = dateDe(cfg.release.free_from),
    until = dateDe(ownUntil),
    after = String(Number(cfg.release.free_until.slice(0, 4)) + 1);
  const plans = [
    { id: 'free', name: 'Starter', price: 5, items: de ? ['1 Kalender', 'Online-Buchungsseite', 'E-Mail-Erinnerungen', 'Chat'] : ['1 calendar', 'Online booking page', 'Email reminders', 'Chat'] },
    { id: 'pro', name: 'Pro', price: 15, items: de ? ['Bis 5 Teammitglieder', 'Slotdove KI', 'Auswertungen', 'Alles aus Starter'] : ['Up to 5 team members', 'Slotdove AI', 'Analytics', 'Everything in Starter'] },
    { id: 'business', name: 'Business', price: 25, items: de ? ['Bis 50 Teammitglieder', 'Mehrere Standorte', 'Bevorzugter Support', 'Alles aus Pro'] : ['Up to 50 team members', 'Multiple locations', 'Priority support', 'Everything in Pro'] },
  ];
  return (
    <>
      <Heading title={de ? 'Dein Tarif' : 'Your plan'} description={de ? `Kostenlos vom ${from} bis ${until}.` : `Free from ${from} to ${until}.`} />
      <div className="free-banner" style={{ maxWidth: 'none' }}>
        <strong>0 €</strong>
        <span>
          {de ? `Alle Funktionen kostenlos · ${from} – ${until}` : `All features free · ${from} – ${until}`}
          <small>{de ? 'Slotdove ist ein privates, nicht-kommerzielles Testprojekt: Es wird kein Geld verlangt, es gibt kein Abo und nichts zu kündigen. Bereitstellung ohne Gewähr.' : 'Slotdove is a private, non-commercial test project: no money is requested, no subscription. Provided without warranty.'}</small>
        </span>
      </div>
      {w.business.early_adopter && (
        <p className="notice" style={{ marginBottom: 12 }}>
          {de ? '⭐ Du bist Early Adopter – danke, dass du von Anfang an dabei bist!' : '⭐ You are an early adopter – thank you!'}
        </p>
      )}
      <SupportCard support={cfg.support} de={de} compact />
      <h3 style={{ margin: '26px 0 12px' }}>{de ? `Unverbindliche Beispielpreise für eine mögliche Weiterführung ab ${after}` : `Non-binding example prices for a possible continuation from ${after}`}</h3>
      <div className="plan-grid">
        {plans.map((p) => (
          <div key={p.id} className={`plan-card ${p.id === 'pro' ? 'featured' : ''}`}>
            <span className="badge">{de ? 'nur Beispiel' : 'example only'}</span>
            <h3>{p.name}</h3>
            <div className="plan-price">
              <strong>{p.price} €</strong>
              <span>/{de ? 'Monat' : 'month'}</span>
            </div>
            <ul>
              {p.items.map((i) => (
                <li key={i}>
                  <Check size={14} /> {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 18 }}>
        {de ? `Aktuell zugeordnet: ${w.plan === 'free' ? 'Starter' : w.plan === 'pro' ? 'Pro' : 'Business'} – in der Gratis-Phase sind trotzdem alle Funktionen frei.` : 'All features are free during the launch phase.'}
      </p>
    </>
  );
}
