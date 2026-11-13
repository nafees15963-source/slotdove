'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { useI18n } from '../providers';
import { useWorkspace } from './shell';
import { api, friendlyError } from '@/lib/api-client';
import { Button } from '../ui/button';
import { dateLabel } from '@/lib/utils';
type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
type Member = { user_id: string; role: 'admin' | 'staff' };
export function TeamAccess({ refreshKey }: { refreshKey: boolean }) {
  const { t, locale } = useI18n(),
    w = useWorkspace(),
    router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ data: Invitation[] }>(`/api/businesses/${w.business.id}/invitations`),
      api<{ data: Member[] }>(`/api/businesses/${w.business.id}/members`),
    ])
      .then(([i, m]) => {
        if (active) {
          setInvitations(i.data);
          setMembers(m.data);
        }
      })
      .catch((e) => {
        if (active) setError(friendlyError(e, locale));
      });
    return () => {
      active = false;
    };
  }, [w.business.id, refreshKey, locale]);
  async function change(member: Member, role: Member['role'], remove = false) {
    if (remove && !confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      await api(`/api/businesses/${w.business.id}/members`, 'POST', {
        user_id: member.user_id,
        role,
        remove,
      });
      setMembers((m) =>
        remove
          ? m.filter((x) => x.user_id !== member.user_id)
          : m.map((x) => (x.user_id === member.user_id ? { ...x, role } : x)),
      );
      toast.success(t.saved);
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack" style={{ marginTop: 25 }}>
      {error && <p className="notice notice-error">{error}</p>}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            {locale === 'de' ? 'Konten mit Teamzugang' : 'Accounts with team access'}
          </h2>
          <ShieldCheck size={17} className="purple" />
        </div>
        <div className="panel-body stack">
          {members.length ? (
            members.map((m) => (
              <div className="spread" key={m.user_id}>
                <strong style={{ fontSize: 12 }}>
                  {w.staff.find((s) => s.user_id === m.user_id)?.name || t.staffRole}
                </strong>
                <div className="row">
                  <select
                    value={m.role}
                    aria-label={t.role}
                    disabled={busy || w.role !== 'owner'}
                    onChange={(e) => change(m, e.target.value as Member['role'])}
                  >
                    <option value="staff">{t.staffRole}</option>
                    <option value="admin">{t.adminRole}</option>
                  </select>
                  {w.role === 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => change(m, m.role, true)}
                      aria-label={t.delete}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12 }}>
              {locale === 'de'
                ? 'Deine Mitarbeiterprofile stehen oben. Ein Login erscheint hier, sobald die Person ihre Einladung angenommen hat.'
                : 'Your staff profiles appear above. An account appears here once the person accepts their invitation.'}
            </p>
          )}
        </div>
      </div>
      <div className="panel table-wrap">
        <div className="panel-head">
          <h2 className="panel-title">{t.invitations}</h2>
        </div>
        {invitations.length ? (
          <table>
            <thead>
              <tr>
                <th>{t.email}</th>
                <th>{t.role}</th>
                <th>{t.expires}</th>
                <th>{t.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitations.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{i.role}</td>
                  <td>{dateLabel(i.expires_at, w.business.timezone, locale)}</td>
                  <td>
                    <span className="badge">
                      {i.accepted_at
                        ? locale === 'de'
                          ? 'Angenommen'
                          : 'Accepted'
                        : i.revoked_at
                          ? locale === 'de'
                            ? 'Widerrufen'
                            : 'Revoked'
                          : new Date(i.expires_at) < new Date()
                            ? locale === 'de'
                              ? 'Abgelaufen'
                              : 'Expired'
                            : locale === 'de'
                              ? 'Offen'
                              : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {w.role === 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t.delete}
                        onClick={async () => {
                          if (!confirm(t.deleteConfirm)) return;
                          try {
                            await api(
                              `/api/businesses/${w.business.id}/invitations?item=${i.id}`,
                              'DELETE',
                            );
                            setInvitations((list) => list.filter((x) => x.id !== i.id));
                            toast.success(t.saved);
                          } catch (e) {
                            toast.error(friendlyError(e, locale));
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="panel-body">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
