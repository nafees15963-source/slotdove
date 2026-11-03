'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock3,
  Scissors,
  Search,
  Download,
  MoreHorizontal,
  ArrowUpRight,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Heading, AddButton, Empty } from './common';
import { TeamAccess } from './team-access';
import { EntityForm } from './forms';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { api, friendlyError } from '@/lib/api-client';
import { money, dateLabel } from '@/lib/utils';
import type { Service, Customer, Staff } from '@/lib/types';
export function Entities({ kind }: { kind: 'services' | 'customers' | 'staff' }) {
  const w = useWorkspace(),
    { t, locale } = useI18n(),
    router = useRouter();
  const [search, setSearch] = useState(''),
    [edit, setEdit] = useState<Service | Customer | Staff | undefined>(),
    [open, setOpen] = useState(false),
    [invite, setInvite] = useState(false),
    [assign, setAssign] = useState<Service | null>(null),
    [history, setHistory] = useState<Customer | null>(null),
    [customers, setCustomers] = useState<Customer[]>(w.customers),
    [page, setPage] = useState(0),
    [more, setMore] = useState(w.customers.length === 100),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (kind !== 'customers') return;
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      api<{ data: Customer[]; count: number }>(
        `/api/businesses/${w.business.id}/customers?page=0&search=${encodeURIComponent(search)}`,
      )
        .then((r) => {
          if (active) {
            setCustomers(r.data);
            setPage(0);
            setMore(r.count > 100);
          }
        })
        .catch((e) => {
          if (active) toast.error(friendlyError(e, locale));
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind, w.business.id, search, locale]);
  const items = kind === 'services' ? w.services : kind === 'staff' ? w.staff : customers;
  const filtered = items.filter((i) =>
    `${i.name} ${'email' in i ? i.email : ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const create = () => {
    setEdit(undefined);
    setOpen(true);
  };
  const onEdit = (item: Service | Customer | Staff) => {
    setEdit(item);
    setOpen(true);
  };
  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await api(`/api/businesses/${w.business.id}/${kind}?item=${id}`, 'DELETE');
      toast.success(t.saved);
      if (kind === 'customers') setCustomers((c) => c.filter((v) => v.id !== id));
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    }
  }
  async function loadMore() {
    setBusy(true);
    try {
      const r = await api<{ data: Customer[]; count: number }>(
        `/api/businesses/${w.business.id}/customers?page=${page + 1}&search=${encodeURIComponent(search)}`,
      );
      setCustomers((c) => [...c, ...r.data.filter((x) => !c.some((y) => y.id === x.id))]);
      setPage(page + 1);
      setMore((page + 2) * 100 < r.count);
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title={t[kind]}
        description={
          kind === 'services'
            ? t.noServices
            : kind === 'staff'
              ? t.noStaff
              : locale === 'de'
                ? 'Deine Kunden. Persönlich im Blick.'
                : 'Your customers. A more personal perspective.'
        }
        action={
          <>
            {kind === 'customers' && (
              <Button variant="outline" asChild>
                <a href={`/api/businesses/${w.business.id}/export`}>
                  <Download size={14} />
                  {t.export}
                </a>
              </Button>
            )}
            {kind === 'staff' && w.role === 'owner' && (
              <Button variant="outline" onClick={() => setInvite(true)}>
                <UserPlus size={14} />
                {t.invitation}
              </Button>
            )}
            <AddButton onClick={create}>
              {kind === 'services'
                ? t.newService
                : kind === 'customers'
                  ? t.newCustomer
                  : t.newStaff}
            </AddButton>
          </>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={15} />
          <input
            aria-label={t.search}
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <small>
          {filtered.length} {t[kind]}
        </small>
      </div>
      {!filtered.length ? (
        <div className="panel">
          <Empty
            title={search ? t.noResults : undefined}
            action={!search && <AddButton onClick={create}>{t.add}</AddButton>}
          />
        </div>
      ) : kind === 'services' ? (
        <div className="grid-3">
          {(filtered as Service[]).map((s) => (
            <div className="panel service-card" key={s.id}>
              <div className="spread">
                <div className="service-icon" style={{ color: s.color }}>
                  <Scissors size={21} strokeWidth={1.5} />
                </div>
                <span className={`badge ${s.active ? 'badge-green' : ''}`}>
                  {s.active ? t.active : t.archive}
                </span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <div className="service-meta">
                <span>
                  <Clock3 size={13} />
                  {s.duration_minutes} {t.minutes}
                </span>
                <strong>{money(s.price_cents, w.business.currency, locale)}</strong>
              </div>
              <div className="service-footer">
                <Button size="sm" variant="ghost" onClick={() => setAssign(s)}>
                  {t.assign}
                  <ArrowUpRight size={11} />
                </Button>
                <div className="row">
                  <Button size="sm" variant="outline" onClick={() => onEdit(s)}>
                    {t.edit}
                  </Button>
                  {s.active && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(s.id)}
                      aria-label={t.archive}
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : kind === 'staff' ? (
        <div className="grid-3">
          {(filtered as Staff[]).map((s) => (
            <div className="panel panel-body" key={s.id}>
              <div className="spread">
                <span className="avatar" style={{ width: 50, height: 50, fontSize: 17 }}>
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
                <span className={`badge ${s.active ? 'badge-green' : ''}`}>
                  {s.active ? t.active : t.archive}
                </span>
              </div>
              <h3 style={{ margin: '22px 0 7px' }}>{s.name}</h3>
              <p style={{ fontSize: 11 }}>
                {w.assignments.filter((a) => a.staff_id === s.id).length} {t.services} ·{' '}
                {w.availability.filter((a) => a.staff_id === s.id).length} {t.businessHours}
              </p>
              <div className="service-footer" style={{ marginTop: 22 }}>
                <Button variant="outline" size="sm" onClick={() => onEdit(s)}>
                  {t.edit}
                </Button>
                {s.active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(s.id)}
                    aria-label={t.archive}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.customer}</th>
                <th>{t.email}</th>
                <th>{t.phone}</th>
                <th>{t.appointments}</th>
                <th>{t.edit}</th>
              </tr>
            </thead>
            <tbody>
              {(filtered as Customer[]).map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row">
                      <span className="avatar">{c.name.slice(0, 2).toUpperCase()}</span>
                      {c.name}
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setHistory(c)}>
                      {t.view}
                      <ArrowUpRight size={12} />
                    </Button>
                  </td>
                  <td>
                    <div className="row">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(c)}
                        aria-label={t.edit}
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(c.id)}
                        aria-label={t.delete}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {more && (
            <div className="panel-body">
              <Button variant="outline" onClick={loadMore} disabled={busy}>
                {busy ? t.loading : locale === 'de' ? 'Weitere laden' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
      {kind === 'staff' && <TeamAccess refreshKey={invite} />}
      {open && (
        <EntityForm
          kind={kind === 'services' ? 'service' : kind === 'staff' ? 'staff' : 'customer'}
          open
          onClose={() => {
            setOpen(false);
            if (kind === 'customers')
              api<{ data: Customer[]; count: number }>(
                `/api/businesses/${w.business.id}/customers?page=0&search=${encodeURIComponent(search)}`,
              )
                .then((r) => {
                  setCustomers(r.data);
                  setPage(0);
                  setMore(r.count > 100);
                })
                .catch(() => {});
          }}
          initial={edit}
        />
      )}
      {invite && <EntityForm kind="invite" open onClose={() => setInvite(false)} />}
      <Dialog open={!!assign} onOpenChange={(v) => !v && setAssign(null)} title={t.assign}>
        {assign && (
          <div className="stack">
            {w.staff
              .filter((s) => s.active)
              .map((s) => {
                const checked = w.assignments.some(
                  (a) => a.staff_id === s.id && a.service_id === assign.id,
                );
                return (
                  <label key={s.id} className="check-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={async (e) => {
                        try {
                          await api(`/api/businesses/${w.business.id}/assignments`, 'POST', {
                            service_id: assign.id,
                            staff_id: s.id,
                            assigned: e.target.checked,
                          });
                          router.refresh();
                        } catch (e) {
                          toast.error(friendlyError(e, locale));
                        }
                      }}
                    />
                    {s.name}
                  </label>
                );
              })}
            {!w.staff.some((s) => s.active) && <p>{t.noStaff}</p>}
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!history}
        onOpenChange={(v) => !v && setHistory(null)}
        title={history?.name || t.customer}
      >
        {history && (
          <div className="stack">
            <p>{history.notes || t.internalNotes + ': —'}</p>
            <div className="row wrap">
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/businesses/${w.business.id}/customer-export?item=${history.id}`}>
                  <Download size={13} />
                  {t.privacyExport}
                </a>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (
                    !confirm(
                      locale === 'de'
                        ? 'Persönliche Daten dieses Kunden und seiner Termine unwiderruflich anonymisieren? Geplante E-Mails werden unterdrückt und Verwaltungslinks ungültig.'
                        : 'Permanently anonymize personal information for this customer and their appointments? Scheduled email will be suppressed and private links revoked.',
                    )
                  )
                    return;
                  try {
                    await api(`/api/businesses/${w.business.id}/anonymize-customer`, 'POST', {
                      id: history.id,
                      confirm: true,
                    });
                    setCustomers((list) =>
                      list.map((c) =>
                        c.id === history.id
                          ? {
                              ...c,
                              name: 'Deleted customer',
                              email: `deleted-${c.id}@example.invalid`,
                              phone: '',
                              notes: '',
                            }
                          : c,
                      ),
                    );
                    setHistory(null);
                    toast.success(t.saved);
                    router.refresh();
                  } catch (e) {
                    toast.error(friendlyError(e, locale));
                  }
                }}
              >
                {locale === 'de' ? 'Daten anonymisieren' : 'Anonymize data'}
              </Button>
            </div>
            <small>
              {locale === 'de'
                ? 'Termine im geladenen Zeitraum'
                : 'Appointments in the loaded period'}
            </small>
            {w.bookings
              .filter((b) => b.customer_id === history.id)
              .map((b) => (
                <div key={b.id} className="notice">
                  <strong>{b.service_name}</strong>
                  <p>
                    {dateLabel(b.starts_at, w.business.timezone, locale)} · {t[b.status]}
                  </p>
                </div>
              ))}
            {!w.bookings.some((b) => b.customer_id === history.id) && <p>{t.noAppointmentsSub}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}
