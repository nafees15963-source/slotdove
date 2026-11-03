'use client';
import { CalendarDays, Plus, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../providers';
import { Button } from '../ui/button';
import { useWorkspace } from './shell';
import { dateLabel } from '@/lib/utils';
import type { Booking } from '@/lib/types';
export function Empty({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <div className="empty-icon">
        <CalendarDays size={25} strokeWidth={1.4} />
      </div>
      <h3>{title || t.empty}</h3>
      <p>{description || t.createFirst}</p>
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}
export function Heading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="row">{action}</div>}
    </div>
  );
}
export function Status({ status }: { status: Booking['status'] }) {
  const { t } = useI18n();
  return (
    <span
      className={`badge ${status === 'confirmed' || status === 'completed' ? 'badge-green' : status === 'cancelled' || status === 'no_show' ? 'badge-red' : 'badge-amber'}`}
    >
      <span className="dot" />
      {t[status]}
    </span>
  );
}
export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Plus size={15} />
      {children}
    </Button>
  );
}
export function BookingTable({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  const { t, locale } = useI18n(),
    w = useWorkspace();
  return bookings.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.customer}</th>
            <th>{t.service}</th>
            <th>{t.date}</th>
            <th>{t.status}</th>
            <th>
              <span className="sr-only">{t.view}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                <div className="row">
                  <span className="avatar">{b.customer_name.slice(0, 2).toUpperCase()}</span>
                  <span>
                    {b.customer_name}
                    {b.is_sample && (
                      <>
                        <br />
                        <small>{t.sample}</small>
                      </>
                    )}
                  </span>
                </div>
              </td>
              <td>
                {b.service_name}
                <br />
                <small>{w.staff.find((s) => s.id === b.staff_id)?.name}</small>
              </td>
              <td>{dateLabel(b.starts_at, w.business.timezone, locale)}</td>
              <td>
                <Status status={b.status} />
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelect(b)}
                  aria-label={`${t.view}: ${b.customer_name}`}
                >
                  <ArrowUpRight size={15} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title={t.noAppointments} description={t.noAppointmentsSub} />
  );
}
