'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Copy, Sparkles, Wand2, TrendingUp, AlertCircle, Lightbulb, UserX } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { useWorkspace, useWorkspaceUI } from './shell';
import { useI18n } from '../providers';
import { BookingDetail } from './forms';
import { Status } from './common';
import type { Booking } from '@/lib/types';
import { computeInsights } from '@/lib/ai/insights';
import { parseBookingText } from '@/lib/ai/parse';
import { industryById } from '@/lib/industries';

export function Overview() {
  const w = useWorkspace(),
    ui = useWorkspaceUI(),
    { locale } = useI18n();
  const de = locale === 'de';
  const tz = w.business.timezone;
  const [selected, setSelected] = useState<Booking | null>(null);
  const [quick, setQuick] = useState('');
  const today = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  const hour = Number(formatInTimeZone(new Date(), tz, 'H'));
  const greeting = de
    ? hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Hallo' : 'Guten Abend'
    : hour < 11 ? 'Good morning' : hour < 17 ? 'Hello' : 'Good evening';
  const todays = w.bookings
    .filter((b) => formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') === today && b.status !== 'cancelled')
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = w.bookings.filter((b) => b.starts_at > new Date().toISOString() && ['confirmed', 'pending'].includes(b.status) && formatInTimeZone(b.starts_at, tz, 'yyyy-MM-dd') !== today).slice(0, 5);
  const insights = useMemo(() => computeInsights(w), [w]);
  const revenueToday = todays.reduce((s, b) => s + b.price_cents, 0);
  const money = (c: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: w.business.currency, maximumFractionDigits: 0 }).format(c / 100);
  const parsed = quick.trim().length > 3 ? parseBookingText(quick, { today, services: w.services.filter((s) => s.active), staff: w.staff.filter((s) => s.active) }) : null;
  const checks = [
    { label: de ? 'Leistung anlegen' : 'Add a service', done: w.services.some((s) => s.active), href: '/dashboard/services' },
    { label: de ? 'Arbeitszeiten festlegen' : 'Set working hours', done: w.availability.length > 0, href: '/dashboard/availability' },
    { label: de ? 'Ersten Termin eintragen' : 'Add the first appointment', done: w.bookings.length > 0, href: '/dashboard/calendar' },
    { label: de ? 'Buchungsseite veröffentlichen' : 'Publish booking page', done: w.business.published, href: '/dashboard/booking' },
  ];
  const progress = checks.filter((c) => c.done).length;
  const industry = industryById(w.business.industry);
  const now = new Date().toISOString();
  return (
    <>
      <section className="hero-card">
        <div>
          <div className="eyebrow">
            {industry.emoji} {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date())}
          </div>
          <h1>
            {greeting}! <span className="wave">👋</span>
          </h1>
          <p>
            {todays.length
              ? de
                ? `Heute stehen ${todays.length} Termine an${revenueToday ? ` · ${money(revenueToday)} Umsatz` : ''}.`
                : `${todays.length} appointments today${revenueToday ? ` · ${money(revenueToday)} revenue` : ''}.`
              : de
                ? 'Heute ist noch nichts geplant. Zeit für neue Termine!'
                : 'Nothing planned today yet. Time for new bookings!'}
          </p>
        </div>
        {w.role !== 'staff' && w.features.includes('assistant') && (
          <form
            className="quick-add"
            data-tour="quick-add"
            onSubmit={(e) => {
              e.preventDefault();
              ui.openBooking({ ...(parsed || {}), text: quick });
              setQuick('');
            }}
          >
            <Sparkles size={18} className="quick-icon" />
            <input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder={de ? 'Termin in einem Satz: „Morgen 14 Uhr Haarschnitt Anna“' : 'One sentence: “tomorrow 2pm haircut Anna”'}
              aria-label={de ? 'Termin schnell eintragen' : 'Quick add appointment'}
            />
            <button className="btn btn-primary">
              <Wand2 size={15} />
              <span className="hide-sm">{de ? 'Eintragen' : 'Add'}</span>
            </button>
            {parsed && parsed.understood.length > 0 && (
              <div className="quick-chips">
                {parsed.date && <span>📅 {new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(parsed.date + 'T12:00:00Z'))}</span>}
                {parsed.time && <span>🕑 {parsed.time}</span>}
                {parsed.serviceId && <span>✂️ {w.services.find((s) => s.id === parsed.serviceId)?.name}</span>}
                {parsed.name && <span>👤 {parsed.name}</span>}
                {parsed.staffId && <span>🧑‍💼 {w.staff.find((s) => s.id === parsed.staffId)?.name}</span>}
                {parsed.phone && <span>📞 {parsed.phone}</span>}
              </div>
            )}
          </form>
        )}
      </section>
      <div className="kpi-row">
        {[
          { label: de ? 'Heute' : 'Today', value: String(todays.length), sub: de ? 'Termine' : 'appointments' },
          { label: de ? 'Diesen Monat' : 'This month', value: String(w.stats?.total ?? 0), sub: de ? 'Termine gesamt' : 'total' },
          { label: de ? 'Bestätigt' : 'Confirmed', value: String(w.stats?.confirmed ?? 0), sub: de ? 'diesen Monat' : 'this month' },
          { label: de ? 'Kunden' : 'Customers', value: String(w.stats?.customers ?? w.customers.length), sub: de ? 'insgesamt' : 'in total' },
        ].map((k, n) => (
          <div className="kpi" key={k.label} style={{ animationDelay: `${n * 60}ms` }}>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span>{k.sub}</span>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <div className="stack" style={{ alignContent: 'start' }}>
          <div className="panel" data-tour="today">
            <div className="panel-head">
              <h2 className="panel-title">{de ? 'Dein Tag' : 'Your day'}</h2>
              <Link className="row purple small-link" href="/dashboard/calendar">
                {de ? 'Kalender' : 'Calendar'} <ArrowUpRight size={13} />
              </Link>
            </div>
            {todays.length ? (
              <ol className="timeline">
                {todays.map((b) => {
                  const svc = w.services.find((s) => s.id === b.service_id);
                  const live = b.starts_at <= now && b.ends_at > now;
                  return (
                    <li key={b.id} className={live ? 'live' : b.ends_at < now ? 'past' : ''}>
                      <time>{formatInTimeZone(b.starts_at, tz, 'HH:mm')}</time>
                      <span className="tl-dot" style={{ background: svc?.color }} />
                      <button className="tl-card" onClick={() => setSelected(b)} style={{ borderLeftColor: svc?.color }}>
                        <div>
                          <strong>{b.customer_name}</strong>
                          <small>
                            {b.service_name} · {formatInTimeZone(b.starts_at, tz, 'HH:mm')}–{formatInTimeZone(b.ends_at, tz, 'HH:mm')}
                            {b.staff_id ? ` · ${w.staff.find((s) => s.id === b.staff_id)?.name}` : ''}
                          </small>
                        </div>
                        <div className="row">
                          {!b.staff_id && <span className="badge badge-amber">{de ? 'ohne Mitarbeiter' : 'unassigned'}</span>}
                          {live && <span className="badge badge-purple">{de ? 'läuft' : 'now'}</span>}
                          <Status status={b.status} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="empty-day">
                <div className="empty-illu">☕</div>
                <p>{de ? 'Ein freier Tag im Kalender.' : 'A free day in the calendar.'}</p>
                {w.role !== 'staff' && (
                  <button className="btn btn-outline btn-sm" onClick={() => ui.openBooking()}>
                    {de ? 'Termin eintragen' : 'Add appointment'}
                  </button>
                )}
              </div>
            )}
          </div>
          {upcoming.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2 className="panel-title">{de ? 'Demnächst' : 'Coming up'}</h2>
                <Link className="row purple small-link" href="/dashboard/appointments">
                  {de ? 'Alle' : 'All'} <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="list">
                {upcoming.map((b) => (
                  <button className="list-row" key={b.id} onClick={() => setSelected(b)}>
                    <span className="date-tile">
                      <b>{formatInTimeZone(b.starts_at, tz, 'dd')}</b>
                      <small>{new Intl.DateTimeFormat(locale, { month: 'short', timeZone: tz }).format(new Date(b.starts_at))}</small>
                    </span>
                    <span className="grow">
                      <strong>{b.customer_name}</strong>
                      <small>
                        {b.service_name} · {formatInTimeZone(b.starts_at, tz, 'HH:mm')}
                      </small>
                    </span>
                    <Status status={b.status} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="stack" style={{ alignContent: 'start' }}>
          {progress < 4 && w.role !== 'staff' && (
            <div className="panel panel-body setup-card">
              <div className="spread">
                <h3 className="panel-title">{de ? 'Startklar werden' : 'Get ready'}</h3>
                <span className="badge badge-purple">{progress}/4</span>
              </div>
              <div className="progress">
                <span style={{ width: `${(progress / 4) * 100}%` }} />
              </div>
              <div className="checklist">
                {checks.map((c, i) => (
                  <Link href={c.href} className="check-row" key={c.label}>
                    <span className={`check-circle ${c.done ? 'done' : ''}`}>{c.done ? <Check size={11} /> : i + 1}</span>
                    <span>{c.label}</span>
                    <ArrowRight size={13} className="muted" style={{ marginLeft: 'auto' }} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {w.features.includes('assistant') && (
            <div className="panel panel-body insights-card" data-tour="insights">
              <div className="spread">
                <h3 className="panel-title row">
                  <Sparkles size={16} className="purple" /> {de ? 'KI-Tipps' : 'AI tips'}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => ui.openAssistant()}>
                  {de ? 'Fragen' : 'Ask'}
                </button>
              </div>
              {insights.length ? (
                <div className="insight-list">
                  {insights.slice(0, 5).map((i) => {
                    const Icon = i.tone === 'warn' ? AlertCircle : i.tone === 'good' ? TrendingUp : i.id === 'noshow' ? UserX : Lightbulb;
                    const content = (
                      <>
                        <Icon size={16} />
                        <span>{de ? i.de : i.en}</span>
                      </>
                    );
                    return i.href ? (
                      <Link key={i.id} href={i.href} className={`insight ${i.tone}`}>
                        {content}
                      </Link>
                    ) : (
                      <div key={i.id} className={`insight ${i.tone}`}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">{de ? 'Sobald Termine da sind, bekommst du hier Tipps.' : 'Tips appear here once you have appointments.'}</p>
              )}
            </div>
          )}
          {w.role !== 'staff' && (
            <div className="share-card">
              <div className="eyebrow">{de ? 'Deine Buchungsseite' : 'Your booking page'}</div>
              <strong>/b/{w.business.slug}</strong>
              <p>{w.business.published ? (de ? 'Online – Kunden können buchen.' : 'Online – customers can book.') : de ? 'Noch offline.' : 'Still offline.'}</p>
              <div className="row">
                <button
                  className="btn btn-sm btn-light"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${location.origin}/b/${w.business.slug}`);
                    toast.success(de ? 'Link kopiert' : 'Link copied');
                  }}
                >
                  <Copy size={13} /> {de ? 'Link kopieren' : 'Copy link'}
                </button>
                <Link className="btn btn-sm btn-glass" href="/dashboard/booking">
                  {de ? 'Einstellen' : 'Configure'}
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
      <BookingDetail booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
export function ActivityChart() {
  const w = useWorkspace(),
    { locale } = useI18n();
  const values = Array.from(
    { length: 7 },
    (_, d) => w.bookings.filter((b) => Number(formatInTimeZone(b.starts_at, w.business.timezone, 'i')) === d + 1 && b.status !== 'cancelled').length,
  );
  const max = Math.max(...values, 1);
  const top = values.indexOf(Math.max(...values));
  return (
    <div className="bar-chart" role="img" aria-label={values.join(', ')}>
      {values.map((v, i) => (
        <div className="chart-column" key={i}>
          <small>{v}</small>
          <div className="chart-bar" style={{ height: `${Math.max(4, (v / max) * 100)}px`, opacity: i === top ? 1 : 0.45, animationDelay: `${i * 70}ms` }} />
          <small>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 10, 2 + i))}</small>
        </div>
      ))}
    </div>
  );
}
