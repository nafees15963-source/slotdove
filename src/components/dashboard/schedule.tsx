'use client';
import { useState, useEffect } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace, useWorkspaceUI } from './shell';
import { useI18n } from '../providers';
import { Button } from '../ui/button';
import { Heading, AddButton, BookingTable } from './common';
import { BookingDetail } from './forms';
import { api, friendlyError } from '@/lib/api-client';
import type { Booking } from '@/lib/types';
export function Schedule({ listOnly = false }: { listOnly?: boolean }) {
  const w = useWorkspace(),
    ui = useWorkspaceUI(),
    { t, locale } = useI18n();
  const [date, setDate] = useState(
      () => new Date(formatInTimeZone(new Date(), w.business.timezone, 'yyyy-MM-dd') + 'T12:00:00'),
    ),
    [view, setView] = useState<'month' | 'week' | 'day' | 'list'>(listOnly ? 'list' : 'month'),
    [staff, setStaff] = useState(''),
    [status, setStatus] = useState(''),
    [service, setService] = useState(''),
    [detail, setDetail] = useState<Booking | null>(null),
    [remote, setRemote] = useState<Booking[] | null>(null),
    [loading, setLoading] = useState(false);
  const start =
    view === 'month'
      ? startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
      : view === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : date;
  const end =
    view === 'month'
      ? endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
      : view === 'week'
        ? endOfWeek(date, { weekStartsOn: 1 })
        : date;
  const days = eachDayOfInterval({ start, end });
  useEffect(() => {
    let alive = true;
    const from = fromZonedTime(
        format(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd') + 'T00:00:00',
        w.business.timezone,
      ),
      to = fromZonedTime(
        format(addDays(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd') +
          'T00:00:00',
        w.business.timezone,
      );
    setLoading(true);
    api<{ data: Booking[] }>(
      `/api/businesses/${w.business.id}/bookings?from=${from.toISOString()}&to=${to.toISOString()}`,
    )
      .then((r) => {
        if (alive) setRemote(r.data);
      })
      .catch((e) => {
        if (alive) toast.error(friendlyError(e, locale));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [date, w.business.id, w.business.timezone, w.bookings, locale]);
  const bookings = (remote ?? w.bookings).filter(
    (b) =>
      (!staff || b.staff_id === staff) &&
      (!status || b.status === status) &&
      (!service || b.service_id === service),
  );
  function navigate(direction: number) {
    setDate((d) =>
      view === 'month' || view === 'list'
        ? addMonths(d, direction)
        : view === 'week'
          ? addWeeks(d, direction)
          : addDays(d, direction),
    );
  }
  return (
    <>
      <Heading
        title={listOnly ? t.appointments : t.calendar}
        description={w.business.timezone}
        action={
          w.role !== 'staff' && <span data-tour="new-booking"><AddButton onClick={() => ui.openBooking()}>{t.newBooking}</AddButton></span>
        }
      />
      <div className="toolbar">
        <div className="row">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label={t.back}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label={t.next}>
            <ChevronRight size={16} />
          </Button>
          <strong style={{ fontSize: 15 }}>
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)}
          </strong>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setDate(
                new Date(
                  formatInTimeZone(new Date(), w.business.timezone, 'yyyy-MM-dd') + 'T12:00:00',
                ),
              )
            }
          >
            {t.today}
          </Button>
          {loading && <span className="spinner purple" />}
        </div>
        {!listOnly && (
          <div className="tabs" data-tour="views">
            {(['month', 'week', 'day', 'list'] as const).map((v) => (
              <button
                className={`tab ${view === v ? 'active' : ''}`}
                key={v}
                onClick={() => setView(v)}
              >
                {t[v]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="row wrap" style={{ marginBottom: 20 }} data-tour="filters">
        <select
          aria-label={t.employee}
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          style={{ maxWidth: 210 }}
        >
          <option value="">
            {t.all} · {t.staff}
          </option>
          {w.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t.service}
          value={service}
          onChange={(e) => setService(e.target.value)}
          style={{ maxWidth: 210 }}
        >
          <option value="">
            {t.all} · {t.services}
          </option>
          {w.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t.status}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="">
            {t.all} · {t.status}
          </option>
          {(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const).map((s) => (
            <option key={s} value={s}>
              {t[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="panel calendar-container">
        {view === 'list' ? (
          <BookingTable bookings={bookings} onSelect={setDetail} />
        ) : view === 'day' ? (
          <>
            <div className="panel-head">
              <h3>{new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}</h3>
            </div>
            <BookingTable
              bookings={bookings.filter(
                (b) =>
                  formatInTimeZone(b.starts_at, w.business.timezone, 'yyyy-MM-dd') ===
                  format(date, 'yyyy-MM-dd'),
              )}
              onSelect={setDetail}
            />
          </>
        ) : (
          <>
            <div className="calendar-grid">
              {days.slice(0, 7).map((day) => (
                <div className="calendar-day" key={day.toISOString()}>
                  {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((day) => (
                <div
                  className={`${view === 'week' ? 'week-day' : 'calendar-cell'} ${!isSameMonth(day, date) && view === 'month' ? 'other-month' : ''}`}
                  key={day.toISOString()}
                  onDoubleClick={() => w.role !== 'staff' && ui.openBooking({ date: format(day, 'yyyy-MM-dd') })}
                >
                  {w.role !== 'staff' && (
                    <button
                      className="cell-add"
                      aria-label={`${t.newBooking} ${format(day, 'yyyy-MM-dd')}`}
                      onClick={() => ui.openBooking({ date: format(day, 'yyyy-MM-dd') })}
                    >
                      +
                    </button>
                  )}
                  <span className={`calendar-date ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {bookings
                    .filter(
                      (b) =>
                        formatInTimeZone(b.starts_at, w.business.timezone, 'yyyy-MM-dd') ===
                        format(day, 'yyyy-MM-dd'),
                    )
                    .map((b) => (
                      <button
                        onClick={() => setDetail(b)}
                        key={b.id}
                        className={`calendar-event ${b.staff_id ? '' : 'unassigned'}`}
                        style={{
                          opacity: b.status === 'cancelled' ? 0.4 : 1,
                          borderColor: w.services.find((s) => s.id === b.service_id)?.color,
                        }}
                      >
                        <strong>
                          {formatInTimeZone(b.starts_at, w.business.timezone, 'HH:mm')}
                        </strong>{' '}
                        {b.customer_name}
                        <br />
                        {b.service_name}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <small style={{ display: 'block', marginTop: 12 }}>
        {locale === 'de'
          ? 'Bis zu 500 Termine je angezeigtem Monat.'
          : 'Up to 500 appointments per displayed month.'}
      </small>
      <BookingDetail booking={detail} onClose={() => setDetail(null)} />
    </>
  );
}
