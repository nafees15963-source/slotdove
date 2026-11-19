'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Copy, Check, Clock3, Download, MessageCircle } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { useI18n } from '../providers';
import { useWorkspace } from './shell';
import { api, friendlyError } from '@/lib/api-client';
import { dateLabel } from '@/lib/utils';
import type { Booking, Customer, Service, Staff } from '@/lib/types';
import { Status } from './common';
import { InfoTip } from '../tutorial';
export type FormKind = 'service' | 'customer' | 'staff' | 'booking' | 'hours' | 'block' | 'invite';
export function EntityForm({
  kind,
  open,
  onClose,
  initial,
  inviteStaffId,
}: {
  kind: FormKind;
  open: boolean;
  onClose: () => void;
  initial?: Service | Customer | Staff;
  inviteStaffId?: string;
}) {
  const { t, locale } = useI18n(),
    w = useWorkspace(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [inviteLink, setInviteLink] = useState(''),
    [emailStatus, setEmailStatus] = useState(''),
    [writing, setWriting] = useState(false),
    [selectedService, setSelectedService] = useState(w.services.find((s) => s.active)?.id || '');
  const init = initial as Partial<Service & Customer & Staff> | undefined;
  const title =
    kind === 'service'
      ? t.newService
      : kind === 'customer'
        ? t.newCustomer
        : kind === 'staff'
          ? t.newStaff
          : kind === 'booking'
            ? t.newBooking
            : kind === 'hours'
              ? t.addHours
              : kind === 'block'
                ? t.blockTime
                : t.invitation;
  const staff =
    kind === 'booking'
      ? w.staff.filter(
          (st) =>
            st.active &&
            w.assignments.some((a) => a.service_id === selectedService && a.staff_id === st.id),
        )
      : w.staff.filter((s) => s.active);
  function localTime(value: string) {
    const time = fromZonedTime(value, w.business.timezone);
    if (formatInTimeZone(time, w.business.timezone, "yyyy-MM-dd'T'HH:mm") !== value)
      throw new Error('INVALID_SLOT');
    return time.toISOString();
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData);
    let fields: Record<string, unknown> = { ...raw };
    try {
      if (initial) fields.id = initial.id;
      if (kind === 'service')
        fields = {
          ...fields,
          price_cents: Math.round(Number(raw.price) * 100),
          active: raw.active === 'on',
        };
      if (kind === 'staff') fields.active = raw.active === 'on';
      if (kind === 'invite' && !raw.staff_id) delete fields.staff_id;
      if (kind === 'hours') fields.days = formData.getAll('weekday').map(Number);
      if (kind === 'booking')
        fields = {
          ...fields,
          starts_at: localTime(String(raw.datetime)),
          staff_id: raw.staff_id || null,
          idempotency_key: crypto.randomUUID(),
          consent: true,
        };
      if (kind === 'block')
        fields = {
          ...fields,
          starts_at: localTime(String(raw.start)),
          ends_at: localTime(String(raw.end)),
        };
      const resource = {
        service: 'services',
        customer: 'customers',
        staff: 'staff',
        booking: 'bookings',
        hours: 'week-plan',
        block: 'blocks',
        invite: 'invitations',
      }[kind];
      const result = await api<{ url?: string; email_status?: string }>(
        `/api/businesses/${w.business.id}/${resource}`,
        'POST',
        fields,
      );
      if (kind === 'invite' && result.url) {
        setInviteLink(result.url);
        setEmailStatus(result.email_status || 'unavailable');
      } else {
        toast.success(t.saved);
        onClose();
        router.refresh();
      }
    } catch (e) {
      setError(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  const input = (
    name: string,
    label: string,
    type = 'text',
    value?: string | number,
    required = true,
    min?: number,
    max?: number,
  ) => (
    <div className="field" key={name}>
      <label htmlFor={`f-${name}`}>
        {label}
        {name === 'buffer_before' && (
          <InfoTip visual="buffer" text={locale === 'de' ? 'Minuten, die VOR dem Termin frei bleiben, z. B. zum Vorbereiten. Kunden sehen das nicht.' : 'Minutes kept free BEFORE the appointment, e.g. to prepare.'} />
        )}
        {name === 'buffer_after' && (
          <InfoTip visual="buffer" text={locale === 'de' ? 'Minuten NACH dem Termin, z. B. zum Aufräumen. Der nächste Termin beginnt frühestens danach.' : 'Minutes AFTER the appointment, e.g. to clean up.'} />
        )}
        {name === 'duration_minutes' && (
          <InfoTip text={locale === 'de' ? 'Wie lange der Termin für den Kunden dauert.' : 'How long the appointment lasts for the customer.'} />
        )}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={min}
        max={max}
        step={name === 'price' ? '0.01' : name === 'datetime' ? w.business.slot_interval * 60 : undefined}
        maxLength={type === 'text' ? 100 : undefined}
      />
    </div>
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={initial ? t.edit : title}
      description={kind === 'booking' ? w.business.timezone : undefined}
    >
      {inviteLink ? (
        <div className="stack">
          <div className="notice">
            {locale === 'de'
              ? 'Einladung erstellt. Teile diesen privaten Link nur mit der eingeladenen Person. Er gilt sieben Tage; die E-Mail-Adresse muss übereinstimmen.'
              : 'Invitation created. Share this private link only with the invited person. It expires in seven days and requires the matching verified email address.'}
          </div>
          <small>
            {locale === 'de' ? 'E-Mail-Status' : 'Email status'}: {emailStatus}
          </small>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(inviteLink);
              toast.success(t.copied);
            }}
          >
            <Copy size={15} />
            {t.inviteLink}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            {['service', 'customer', 'staff'].includes(kind) &&
              input('name', t.name, 'text', init?.name)}
            {kind === 'service' && (
              <>
                {input(
                  'duration_minutes',
                  t.duration,
                  'number',
                  init?.duration_minutes ?? 30,
                  true,
                  5,
                  480,
                )}
                {input(
                  'price',
                  `${t.price} (${w.business.currency})`,
                  'number',
                  (init?.price_cents ?? 0) / 100,
                  true,
                  0,
                  100000,
                )}
                {input('color', t.color, 'color', init?.color ?? '#0d7f79')}
                {input('buffer_before', t.before, 'number', init?.buffer_before ?? 0, true, 0, 120)}
                {input('buffer_after', t.after, 'number', init?.buffer_after ?? 0, true, 0, 120)}
                <div className="field full">
                  <label htmlFor="description">
                    {t.description}
                    {w.features.includes('assistant') && (
                      <button
                        type="button"
                        className="ai-mini"
                        disabled={writing}
                        onClick={async (e) => {
                          const form = (e.currentTarget as HTMLButtonElement).form!;
                          const nameValue = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
                          if (nameValue.length < 2) return toast.error(locale === 'de' ? 'Gib zuerst einen Namen ein.' : 'Enter a name first.');
                          setWriting(true);
                          try {
                            const r = await api<{ text: string }>('/api/ai/write', 'POST', {
                              business: w.business.id,
                              locale,
                              mode: 'service_description',
                              name: nameValue,
                              minutes: Number((form.elements.namedItem('duration_minutes') as HTMLInputElement).value) || undefined,
                              price: `${(form.elements.namedItem('price') as HTMLInputElement).value} ${w.business.currency}`,
                            });
                            (form.elements.namedItem('description') as HTMLTextAreaElement).value = r.text;
                          } catch (err) {
                            toast.error(locale === 'de' ? 'Die KI ist gerade nicht erreichbar.' : 'AI is unavailable right now.');
                            console.warn(err);
                          } finally {
                            setWriting(false);
                          }
                        }}
                      >
                        {writing ? <span className="spinner" /> : '✨'} {locale === 'de' ? 'Mit KI schreiben' : 'Write with AI'}
                      </button>
                    )}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={init?.description}
                    maxLength={1000}
                  />
                </div>
                <label className="check-label">
                  <input type="checkbox" name="active" defaultChecked={init?.active ?? true} />
                  {t.active}
                </label>
              </>
            )}
            {kind === 'customer' && (
              <>
                {input('email', `${t.email} (optional)`, 'email', init?.email ?? undefined, false)}
                {input('phone', t.phone, 'tel', init?.phone, false)}
                <div className="field full">
                  <label htmlFor="notes">{t.internalNotes}</label>
                  <textarea name="notes" id="notes" maxLength={2000} defaultValue={init?.notes} />
                </div>
              </>
            )}
            {kind === 'staff' && (
              <label className="check-label">
                <input type="checkbox" name="active" defaultChecked={init?.active ?? true} />
                {t.active}
              </label>
            )}
            {kind === 'invite' && (
              <>
                {input('email', t.email, 'email')}
                <div className="field">
                  <label htmlFor="invite-staff">{t.employee}</label>
                  <select name="staff_id" id="invite-staff" defaultValue={inviteStaffId || ''}>
                    <option value="">
                      {locale === 'de' ? 'Neues Teammitglied' : 'New team member'}
                    </option>
                    {w.staff
                      .filter((s) => s.active && !s.user_id)
                      .map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="role">{t.role}</label>
                  <select name="role" id="role">
                    <option value="staff">{t.staffRole}</option>
                    <option value="admin">{t.adminRole}</option>
                  </select>
                </div>
              </>
            )}
            {kind === 'booking' && (
              <>
                <div className="field">
                  <label htmlFor="service">{t.service}</label>
                  <select
                    id="service"
                    name="service_id"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    required
                  >
                    {w.services
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}
            {['booking', 'hours', 'block'].includes(kind) && (
              <div className="field">
                <label htmlFor="staff">{t.employee}</label>
                <select id="staff" name="staff_id" required={kind !== 'booking'}>
                  {kind === 'booking' && <option value="">{locale === 'de' ? 'Später zuweisen' : 'Assign later'}</option>}
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {kind === 'booking' && (
              <>
                {input('datetime', `${t.date} · ${w.business.timezone}`, 'datetime-local')}
                {input('name', t.name)}
                {input('email', t.email, 'email')}
                {input('phone', t.phone, 'tel', undefined, false)}
                <div className="field full">
                  <label htmlFor="notes">{t.notes}</label>
                  <textarea id="notes" name="notes" maxLength={1000} />
                </div>
                <p className="notice full">
                  {locale === 'de'
                    ? `Wähle eine Uhrzeit im ${w.business.slot_interval}-Minuten-Raster, zum Beispiel volle Stunden. Ohne Mitarbeiter bleibt der Termin zur späteren Planung offen. Bei Zuweisung werden Arbeitszeiten und Puffer geprüft.`
                    : 'Working hours, slot interval, and buffers are validated when saving.'}
                </p>
              </>
            )}
            {kind === 'hours' && (
              <>
                <div className="field">
                  <label htmlFor="weekday">{t.weekday}</label>
                  <div className="row wrap">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <label className="check-label" key={d}>
                        <input type="checkbox" name="weekday" value={d} defaultChecked={d > 0 && d < 6} />
                        {new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(
                          new Date(2026, 10, 1 + d),
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                {input('starts', t.from, 'time', '09:00')}
                {input('ends', t.to, 'time', '17:00')}
              </>
            )}
            {kind === 'block' && (
              <>
                {input('start', t.from, 'datetime-local')}
                {input('end', t.to, 'datetime-local')}
                {input('reason', t.reason, 'text', undefined, false)}
              </>
            )}
          </div>
          {error && (
            <div role="alert" className="notice notice-error" style={{ marginTop: 18 }}>
              {error}
            </div>
          )}
          <div className="form-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button
              disabled={busy || (['hours', 'block'].includes(kind) && !staff.length) || (kind === 'booking' && !selectedService)}
            >
              {busy ? <span className="spinner" /> : <Check size={15} />}{' '}
              {kind === 'booking' ? t.saveBooking : t.save}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
export function BookingDetail({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const { t, locale } = useI18n(),
    w = useWorkspace(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [reschedule, setReschedule] = useState(false);
  async function update(patch: Record<string, unknown>) {
    if (!booking) return;
    setBusy(true);
    try {
      await api(`/api/businesses/${w.business.id}/booking-status`, 'POST', {
        id: booking.id,
        ...patch,
      });
      toast.success(t.saved);
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!booking}
      onOpenChange={(v) => !v && onClose()}
      title={booking?.service_name || t.appointments}
    >
      {booking && (
        <div className="stack">
          <div className="spread">
            <div className="row">
              <span className="avatar">{booking.customer_name.slice(0, 2).toUpperCase()}</span>
              <strong>{booking.customer_name}</strong>
            </div>
            <Status status={booking.status} />
          </div>
          <div className="booking-review">
            <div className="row">
              <Clock3 size={16} />
              {dateLabel(booking.starts_at, w.business.timezone, locale)}
            </div>
            <small>
              {w.business.timezone} · {w.staff.find((s) => s.id === booking.staff_id)?.name}
            </small>
            {booking.booking_number && (
              <button
                type="button"
                className="booking-number"
                title={locale === 'de' ? 'Buchungsnummer kopieren' : 'Copy booking number'}
                onClick={async () => {
                  await navigator.clipboard.writeText(booking.booking_number);
                  toast.success(t.copied);
                }}
              >
                # {booking.booking_number}
              </button>
            )}
            {booking.notes && <p>{booking.notes}</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ internal_notes: new FormData(e.currentTarget).get('internal_notes') });
            }}
          >
            <label htmlFor="internal_notes">{t.internalNotes}</label>
            <textarea
              id="internal_notes"
              name="internal_notes"
              maxLength={2000}
              defaultValue={booking.internal_notes}
            />
            <Button variant="outline" size="sm" disabled={busy} style={{ marginTop: 8 }}>
              {t.save}
            </Button>
          </form>
          {w.role !== 'staff' && ['pending', 'confirmed'].includes(booking.status) && <div className="field">
            <label htmlFor="assign-booking">{t.employee}</label>
            <select id="assign-booking" value={booking.staff_id || ''} disabled={busy} onChange={(e) => update({ staff_id: e.target.value || null })}>
              <option value="">{locale === 'de' ? 'Noch nicht zugewiesen' : 'Unassigned'}</option>
              {w.staff.filter((s) => s.active && w.assignments.some((a) => a.staff_id === s.id && a.service_id === booking.service_id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>}
          <div className="row wrap">
            {w.role !== 'staff' &&
              ['cancelled', 'completed', 'no_show'].includes(booking.status) && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !confirm(
                        locale === 'de'
                          ? 'Diesen Termin samt Verlauf und Benachrichtigungen endgültig löschen? Das kann nicht rückgängig gemacht werden.'
                          : 'Permanently delete this appointment, history and notifications? This cannot be undone.',
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      await api(
                        `/api/businesses/${w.business.id}/bookings?item=${booking.id}`,
                        'DELETE',
                      );
                      onClose();
                      router.refresh();
                      toast.success(t.saved);
                    } catch (e) {
                      toast.error(friendlyError(e, locale));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t.delete}
                </Button>
              )}
            {w.role !== 'staff' && w.features.includes('chat') && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  try {
                    const r = await api<{ id: string }>('/api/chat', 'POST', { business: w.business.id, action: 'start-customer', booking: booking.id });
                    router.push(`/dashboard/chat?c=${r.id}`);
                  } catch (e) {
                    toast.error(friendlyError(e, locale));
                  }
                }}
              >
                <MessageCircle size={13} />
                {locale === 'de' ? 'Nachricht senden' : 'Send message'}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/businesses/${w.business.id}/calendar-export?item=${booking.id}`}>
                <Download size={13} />
                {t.download}
              </a>
            </Button>
            {['pending', 'confirmed'].includes(booking.status) && (
              <>
                {booking.status === 'pending' && (
                  <Button size="sm" disabled={busy} onClick={() => update({ status: 'confirmed' })}>
                    {t.confirmed}
                  </Button>
                )}
                {booking.status === 'confirmed' && new Date(booking.starts_at) <= new Date() && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => update({ status: 'completed' })}
                    >
                      {t.completed}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => update({ status: 'no_show' })}
                    >
                      {t.no_show}
                    </Button>
                  </>
                )}
                {w.role !== 'staff' && (
                  <Button variant="outline" size="sm" onClick={() => setReschedule(!reschedule)}>
                    {t.reschedule}
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(t.cancelConfirm)) update({ status: 'cancelled' });
                  }}
                >
                  {t.cancelled}
                </Button>
              </>
            )}
          </div>
          {reschedule && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                const value = String(new FormData(e.currentTarget).get('date'));
                const time = fromZonedTime(value, w.business.timezone);
                if (formatInTimeZone(time, w.business.timezone, "yyyy-MM-dd'T'HH:mm") !== value) {
                  toast.error(t.error);
                  return;
                }
                update({ starts_at: time.toISOString() });
              }}
            >
              <label htmlFor="reschedule">
                {t.date} · {w.business.timezone}
              </label>
              <input
                type="datetime-local"
                id="reschedule"
                name="date"
                required
                defaultValue={formatInTimeZone(
                  booking.starts_at,
                  w.business.timezone,
                  "yyyy-MM-dd'T'HH:mm",
                )}
              />
              <Button disabled={busy}>{t.reschedule}</Button>
            </form>
          )}
        </div>
      )}
    </Dialog>
  );
}
