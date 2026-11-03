'use client';
import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck2,
  Users,
  Scissors,
  UserRound,
  Clock3,
  Globe2,
  BarChart3,
  Bell,
  Plug,
  Settings2,
  CreditCard,
  ChevronRight,
  ChevronsUpDown,
  ArrowUpRight,
  Menu,
  LogOut,
  ShieldCheck,
  LifeBuoy,
} from 'lucide-react';
import { Brand } from '../brand';
import { Preferences } from '../preferences';
import { useI18n } from '../providers';
import { api } from '@/lib/api-client';
import type { Business, Workspace } from '@/lib/types';
import type { Messages } from '@/lib/i18n/en';
import { toast } from 'sonner';
const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const w = useContext(WorkspaceContext);
  if (!w) throw new Error('Workspace missing');
  return w;
}
export const sections = [
  ['overview', LayoutDashboard],
  ['calendar', CalendarDays],
  ['appointments', CalendarCheck2],
  ['customers', Users],
  ['services', Scissors],
  ['staff', UserRound],
  ['availability', Clock3],
  ['booking', Globe2],
  ['analytics', BarChart3],
  ['notifications', Bell],
  ['integrations', Plug],
  ['settings', Settings2],
  ['billing', CreditCard],
] as const;
export function DashboardShell({
  workspace,
  businesses,
  user,
  isAdmin,
  section,
  children,
}: {
  workspace: Workspace;
  businesses: Business[];
  user: { id: string; email: string };
  isAdmin: boolean;
  section: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  const title = t[section as keyof Messages] || t.overview;
  async function logout() {
    try {
      await api('/api/auth', 'POST', { action: 'logout' });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error(t.error);
    }
  }
  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="dashboard-shell">
        {open && (
          <button className="sidebar-scrim" aria-label={t.close} onClick={() => setOpen(false)} />
        )}
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Brand />
          <div className="workspace-switch">
            <span className="avatar">{workspace.business.name.slice(0, 1)}</span>
            <select
              aria-label={t.businessName}
              value={workspace.business.id}
              style={{ border: 0, padding: 0, minHeight: 25, fontSize: 11 }}
              onChange={(e) => {
                document.cookie = `slotdove-business=${e.target.value};path=/;SameSite=Lax`;
                router.refresh();
              }}
            >
              {businesses.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronsUpDown size={12} />
          </div>
          <div className="nav-label">Workspace</div>
          <nav className="side-nav">
            {sections.map(([key, Icon], i) => (
              <Link
                key={key}
                className={`nav-link ${section === key ? 'active' : ''}`}
                style={i === 10 ? { marginTop: 14 } : undefined}
                href={key === 'overview' ? '/dashboard' : `/dashboard/${key}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} strokeWidth={1.6} />
                {t[key]}
                {key === 'booking' && <ArrowUpRight size={12} style={{ marginLeft: 'auto' }} />}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {isAdmin && (
              <Link className="nav-link" href="/admin">
                <ShieldCheck size={16} />
                {t.admin}
              </Link>
            )}
            <div className="help-box">
              <div className="row">
                <LifeBuoy size={14} />
                {t.help}
              </div>
              <p>{t.helpText}</p>
              <Link href="/#faq" className="purple">
                {t.faq} <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </Link>
            </div>
            <div className="user-chip">
              <span className="avatar">{user.email.slice(0, 2).toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email.split('@')[0]}
                </div>
                <small style={{ fontSize: 9 }}>
                  {
                    t[
                      workspace.role === 'owner'
                        ? 'owner'
                        : workspace.role === 'admin'
                          ? 'adminRole'
                          : 'staffRole'
                    ]
                  }
                </small>
              </div>
              <button onClick={logout} className="btn btn-ghost btn-icon" aria-label={t.logout}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>
        <main className="app-main">
          <header className="topbar">
            <div className="row">
              <button
                onClick={() => setOpen(true)}
                className="btn btn-ghost btn-icon mobile-menu"
                aria-label="Menu"
              >
                <Menu size={18} />
              </button>
              <div className="breadcrumbs">
                <span>{workspace.business.name}</span>
                <ChevronRight size={12} />
                <strong>{title}</strong>
              </div>
            </div>
            <div className="topbar-actions">
              {workspace.business.is_demo && <span className="badge badge-amber">{t.demo}</span>}
              <Preferences />
              <Link
                href="/dashboard/notifications"
                className="btn btn-ghost btn-icon"
                aria-label={t.notifications}
              >
                <Bell size={17} />
              </Link>
              <span className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>
                {user.email.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </header>
          <div className="app-content page-fade" key={section}>
            {children}
          </div>
        </main>
      </div>
    </WorkspaceContext.Provider>
  );
}
