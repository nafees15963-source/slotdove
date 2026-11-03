'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Users,
  Clock3,
  CalendarCheck2,
  Copy,
  Plus,
} from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Heading, BookingTable } from './common';
import { Button } from '../ui/button';
import { EntityForm, BookingDetail, type FormKind } from './forms';
import type { Booking } from '@/lib/types';
export function Overview() {
  const w = useWorkspace(),
    { t, locale } = useI18n();
  const [form, setForm] = useState<FormKind | null>(null),
    [selected, setSelected] = useState<Booking | null>(null);
  const today = formatInTimeZone(new Date(), w.business.timezone, 'yyyy-MM-dd');
  const upcoming = w.bookings
    .filter(
      (b) => b.starts_at >= new Date().toISOString() && ['confirmed', 'pending'].includes(b.status),
    )
    .slice(0, 5);
  const todays = w.bookings.filter(
    (b) =>
      formatInTimeZone(b.starts_at, w.business.timezone, 'yyyy-MM-dd') === today &&
      b.status !== 'cancelled',
  );
  const checks = [
    { label: t.stepBusiness, done: true, href: '/dashboard/settings' },
    { label: t.stepService, done: w.services.some((s) => s.active), href: '/dashboard/services' },
    {
      label: t.stepHours,
      done: w.availability.length > 0 && w.assignments.length > 0,
      href: '/dashboard/availability',
    },
    { label: t.stepPublish, done: w.business.published, href: '/dashboard/booking' },
  ];
  return (
    <>
      <Heading
        title={t.welcome}
        description={`${t.welcomeSub} · ${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: w.business.timezone }).format(new Date())}`}
        action={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(`${location.origin}/b/${w.business.slug}`);
                toast.success(t.copied);
              }}
            >
              <Copy size={13} />
              {t.copyLink}
            </Button>
            {w.role !== 'staff' && (
              <Button onClick={() => setForm('booking')}>
                <Plus size={15} />
                {t.newBooking}
              </Button>
            )}
          </>
        }
      />
      <div className="grid-4">
        {[
          { label: t.today, value: todays.length, Icon: CalendarDays, foot: t.appointments },
          { label: t.thisMonth, value: w.stats?.total ?? 0, Icon: CalendarCheck2, foot: t.total },
          { label: t.confirmed, value: w.stats?.confirmed ?? 0, Icon: Check, foot: t.thisMonth },
          {
            label: t.customerCount,
            value: w.stats?.customers ?? 0,
            Icon: Users,
            foot: w.role === 'staff' ? t.staffRole : t.all,
          },
        ].map(({ label, value, Icon, foot }) => (
          <div className="panel metric" key={label}>
            <div className="metric-label">
              {label}
              <Icon size={16} strokeWidth={1.4} />
            </div>
            <div className="metric-value">{value.toString().padStart(2, '0')}</div>
            <div className="metric-foot">
              <span
                className="dot"
                style={{ display: 'inline-block', marginRight: 6, color: 'var(--purple)' }}
              />
              {foot}
            </div>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <div className="stack" style={{ alignContent: 'start' }}>
          <div className="panel">
            <div className="panel-head">
              <div className="row">
                <h2 className="panel-title">{t.upcoming}</h2>
                <span className="badge">{upcoming.length}</span>
              </div>
              <Link className="row purple" href="/dashboard/appointments" style={{ fontSize: 11 }}>
                {t.all}
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <BookingTable bookings={upcoming} onSelect={setSelected} />
          </div>
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t.analytics}</h2>
              <span className="badge">{t.thisMonth}</span>
            </div>
            <div className="panel-body">
              <ActivityChart />
              <div
                className="spread"
                style={{ borderTop: '1px solid var(--line)', marginTop: 20, paddingTop: 17 }}
              >
                <small>
                  {locale === 'de'
                    ? 'Termine nach Wochentag · geladener Zeitraum'
                    : 'Appointments by weekday · loaded period'}
                </small>
                <Link href="/dashboard/analytics" className="purple">
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <aside className="overview-aside stack" style={{ alignContent: 'start' }}>
          <div className="welcome-card">
            <div className="eyebrow">YOUR TIME, REIMAGINED</div>
            <h2>{t.madeFor}</h2>
            <p>
              {locale === 'de'
                ? 'Deine Buchungsseite ist der einfache Weg zu deinem nächsten Termin.'
                : 'Your booking page is the simple way to your next appointment.'}
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/booking">
                {t.booking}
                <ArrowUpRight size={12} />
              </Link>
            </Button>
          </div>
          <div className="panel panel-body">
            <div className="spread">
              <h3 className="panel-title">{t.setup}</h3>
              <span className="badge badge-green">{checks.filter((c) => c.done).length}/4</span>
            </div>
            <div className="checklist">
              {checks.map((c, i) => (
                <Link href={c.href} className="check-row" key={c.label}>
                  <span className={`check-circle ${c.done ? 'done' : ''}`}>
                    {c.done ? <Check size={11} /> : i + 1}
                  </span>
                  <span>{c.label}</span>
                  <ArrowUpRight size={11} className="muted" style={{ marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
          {w.role !== 'staff' && (
            <div className="panel panel-body">
              <h3 className="panel-title" style={{ marginBottom: 15 }}>
                {locale === 'de' ? 'Ein guter nächster Schritt' : 'A good next step'}
              </h3>
              <div className="stack" style={{ gap: 8 }}>
                {[
                  ['customer', Users, t.newCustomer],
                  ['service', Plus, t.newService],
                  ['block', Clock3, t.blockTime],
                ].map(([kind, Icon, label]) => {
                  const I = Icon as typeof Users;
                  return (
                    <button
                      key={String(kind)}
                      className="btn btn-ghost"
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => setForm(kind as FormKind)}
                    >
                      <I size={14} />
                      {String(label)}
                      <ArrowUpRight size={12} style={{ marginLeft: 'auto' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
      {form && <EntityForm kind={form} open onClose={() => setForm(null)} />}
      <BookingDetail booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
export function ActivityChart() {
  const w = useWorkspace(),
    { locale } = useI18n();
  const values = Array.from(
    { length: 7 },
    (_, d) =>
      w.bookings.filter(
        (b) =>
          Number(formatInTimeZone(b.starts_at, w.business.timezone, 'i')) === d + 1 &&
          b.status !== 'cancelled',
      ).length,
  );
  const max = Math.max(...values, 1);
  return (
    <div className="bar-chart" role="img" aria-label={values.join(', ')}>
      {values.map((v, i) => (
        <div className="chart-column" key={i}>
          <small>{v}</small>
          <div
            className="chart-bar"
            style={{ height: `${(v / max) * 100}px`, opacity: i === 1 ? 1 : 0.45 }}
          />
          <small>
            {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
              new Date(2026, 10, 2 + i),
            )}
          </small>
        </div>
      ))}
    </div>
  );
}
