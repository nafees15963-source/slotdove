'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Building2,
  ShieldCheck,
  Plus,
  Copy,
  ArrowLeft,
  Search,
  RotateCcw,
  CalendarPlus,
  ArrowRight,
} from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Heading, Empty } from './dashboard/common';
import { useI18n } from './providers';
import { api, friendlyError } from '@/lib/api-client';
type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  is_demo: boolean;
  demo_expires_at: string | null;
  created_at: string;
  published: boolean;
  business_entitlements: { plan_id: string };
};
type AdminData = {
  businesses: AdminBusiness[];
  bookingCount: number;
  audit: { id: number; action: string; business_id: string; created_at: string }[];
};
export function Admin() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [invite, setInvite] = useState<AdminBusiness | null>(null),
    [inviteLink, setInviteLink] = useState('');
  async function load() {
    try {
      setData(await api<AdminData>('/api/admin'));
    } catch (e) {
      setError(friendlyError(e, locale));
    }
  }
  useEffect(() => {
    let alive = true;
    api<AdminData>('/api/admin')
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(friendlyError(e, locale));
      });
    return () => {
      alive = false;
    };
  }, [locale]);
  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await api<{ url?: string }>('/api/admin', 'POST', payload);
      if (r.url) setInviteLink(r.url);
      else {
        toast.success(t.saved);
        setOpen(false);
      }
      await load();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="market-container">
        <header className="market-nav">
          <Brand />
          <div className="row">
            <Link href="/dashboard" className="btn btn-outline">
              <ArrowLeft size={14} />
              {t.dashboard}
            </Link>
            <Preferences />
          </div>
        </header>
      </div>
      <main className="app-content" style={{ maxWidth: 1250 }}>
        <Heading
          title={t.admin}
          description={
            locale === 'de'
              ? 'Unternehmen, Zugang und Demos. Unter deiner Kontrolle.'
              : 'Businesses, access, and demos. Under your control.'
          }
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t.createBusiness}
            </Button>
          }
        />
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p>{t.loading}</p>}
        {data && (
          <>
            <div className="grid-4">
              {[
                [t.businesses, data.businesses.length],
                [t.active, data.businesses.filter((b) => b.status === 'active').length],
                [t.demo, data.businesses.filter((b) => b.is_demo).length],
                [t.total, data.bookingCount],
              ].map(([label, value]) => (
                <div className="panel metric" key={String(label)}>
                  <div className="metric-label">
                    {label}
                    <Building2 size={16} />
                  </div>
                  <div className="metric-value">{value}</div>
                </div>
              ))}
            </div>
            <div className="toolbar" style={{ marginTop: 30 }}>
              <div className="search-field">
                <Search size={15} />
                <input
                  aria-label={t.search}
                  placeholder={t.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <small>{locale === 'de' ? 'Neueste 100 Unternehmen' : 'Latest 100 businesses'}</small>
            </div>
            <div className="panel table-wrap">
              {!data.businesses.length ? (
                <Empty />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{t.businessName}</th>
                      <th>{t.status}</th>
                      <th>{t.plan}</th>
                      <th>{t.expires}</th>
                      <th>{t.edit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.businesses
                      .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
                      .map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.name}</strong>
                            <br />
                            <small>
                              {b.slug} {b.is_demo && `· ${t.demo}`}
                            </small>
                          </td>
                          <td>
                            <select
                              aria-label={`${t.status}: ${b.name}`}
                              value={b.status}
                              disabled={busy}
                              onChange={(e) =>
                                action({
                                  action: 'access',
                                  id: b.id,
                                  status: e.target.value,
                                  plan: b.business_entitlements?.plan_id || 'free',
                                })
                              }
                              style={{ minWidth: 120, fontSize: 11 }}
                            >
                              <option value="active">{t.active}</option>
                              <option value="suspended">{t.suspend}</option>
                              <option value="archived">{t.archive}</option>
                            </select>
                          </td>
                          <td>
                            <select
                              aria-label={`${t.plan}: ${b.name}`}
                              value={b.business_entitlements?.plan_id || 'free'}
                              disabled={busy}
                              onChange={(e) =>
                                action({
                                  action: 'access',
                                  id: b.id,
                                  status: b.status,
                                  plan: e.target.value,
                                })
                              }
                              style={{ fontSize: 11 }}
                            >
                              {['free', 'pro', 'business'].map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <small>
                              {b.demo_expires_at
                                ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                                    new Date(b.demo_expires_at),
                                  )
                                : '—'}
                            </small>
                          </td>
                          <td>
                            <div className="row wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setInvite(b);
                                  setInviteLink('');
                                }}
                              >
                                {t.invitation}
                              </Button>
                              {b.is_demo && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={t.resetDemo}
                                    disabled={busy}
                                    onClick={() => {
                                      if (confirm(t.deleteConfirm))
                                        action({ action: 'reset', id: b.id, confirm: true });
                                    }}
                                  >
                                    <RotateCcw size={14} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={
                                      locale === 'de' ? '14 Tage verlängern' : 'Extend 14 days'
                                    }
                                    disabled={busy}
                                    onClick={() => action({ action: 'extend', id: b.id })}
                                  >
                                    <CalendarPlus size={14} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => {
                                      if (confirm(t.convertConfirm))
                                        action({ action: 'convert', id: b.id, confirm: true });
                                    }}
                                  >
                                    {locale === 'de' ? 'Umwandeln' : 'Convert'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="panel" style={{ marginTop: 25 }}>
              <div className="panel-head">
                <h2 className="panel-title">
                  {locale === 'de' ? 'Verwaltungsprotokoll' : 'Administration audit log'}
                </h2>
                <ShieldCheck size={17} className="purple" />
              </div>
              <div className="panel-body stack">
                {data.audit.map((a) => (
                  <div key={a.id} className="spread">
                    <span style={{ fontSize: 12 }}>{a.action}</span>
                    <small>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(a.created_at))}
                    </small>
                  </div>
                ))}
                {!data.audit.length && <p>{t.empty}</p>}
              </div>
            </div>
          </>
        )}
      </main>
      <Dialog open={open} onOpenChange={setOpen} title={t.createBusiness}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            action({
              ...f,
              action: 'create',
              is_demo: f.is_demo === 'on',
              currency: 'EUR',
              industry: 'consulting',
            });
          }}
        >
          <div className="form-grid">
            {[
              ['name', t.businessName],
              ['slug', t.bookingUrl],
              ['email', t.email],
            ].map(([name, label]) => (
              <div className="field" key={name}>
                <label htmlFor={name}>{label}</label>
                <input name={name} id={name} type={name === 'email' ? 'email' : 'text'} required />
              </div>
            ))}
            <div className="field">
              <label htmlFor="timezone">{t.timezone}</label>
              <select name="timezone" id="timezone" defaultValue="Europe/Berlin">
                {['UTC', ...Intl.supportedValuesOf('timeZone')].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="locale">{t.language}</label>
              <select name="locale" id="locale" defaultValue={locale}>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="plan">{t.plan}</label>
              <select name="plan" id="plan">
                <option>free</option>
                <option>pro</option>
                <option>business</option>
              </select>
            </div>
            <label className="check-label full">
              <input type="checkbox" name="is_demo" />
              {t.demo} · 14 {locale === 'de' ? 'Tage' : 'days'}
            </label>
          </div>
          <div className="form-actions">
            <Button disabled={busy}>
              {t.create}
              <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={!!invite} onOpenChange={(v) => !v && setInvite(null)} title={t.invitation}>
        {inviteLink ? (
          <div className="stack">
            <p>
              {locale === 'de'
                ? 'Privater Einladungslink für den neuen Inhaber. Die Übernahme erfolgt erst nach Anmeldung mit der bestätigten E-Mail-Adresse.'
                : 'Private invitation link for the new owner. Ownership transfers only after sign-in with the matching verified email address.'}
            </p>
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink);
                toast.success(t.copied);
              }}
            >
              <Copy size={14} />
              {t.inviteLink}
            </Button>
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              action({
                action: 'invite-owner',
                id: invite!.id,
                email: new FormData(e.currentTarget).get('email'),
              });
            }}
          >
            <label htmlFor="owner-email">
              {t.email} · {t.owner}
            </label>
            <input
              id="owner-email"
              name="email"
              type="email"
              required
              defaultValue={invite?.email}
            />
            <Button disabled={busy}>{t.inviteEmail}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
