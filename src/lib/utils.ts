import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (cents: number, currency = 'EUR', locale = 'de') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
export function dateLabel(
  date: string | Date,
  timezone: string,
  locale = 'de',
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
    ...options,
  }).format(new Date(date));
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) =>
    `"${String(v ?? '')
      .replace(/^\s*[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  return [keys.map(cell).join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join(
    '\r\n',
  );
}

/** Team members who can perform a service. Assignment is optional: a service without
 * any assignment can be done by every active team member. */
export function staffForService<S extends { id: string; active: boolean }>(staff: S[], assignments: { service_id: string; staff_id: string }[], serviceId: string) {
  const active = staff.filter((s) => s.active);
  const assigned = active.filter((s) => assignments.some((a) => a.service_id === serviceId && a.staff_id === s.id));
  return assigned.length ? assigned : active;
}
