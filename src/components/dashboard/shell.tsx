'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sun,
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
  Menu,
  LogOut,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  CircleHelp,
  Plus,
  LifeBuoy,
  X,
  Megaphone,
  FlaskConical,
} from 'lucide-react';
import { Brand } from '../brand';
import { Preferences } from '../preferences';
import { useI18n } from '../providers';
import { api } from '@/lib/api-client';
import type { Business, Workspace } from '@/lib/types';
import { toast } from 'sonner';
import { NavigationFeedback } from '../navigation-feedback';
import { TutorialProvider, useTutorial } from '../tutorial';
import { BookingDialog, type BookingPrefill } from './booking-dialog';
import { AssistantPanel } from './assistant';

const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const w = useContext(WorkspaceContext);
  if (!w) throw new Error('Workspace missing');
  return w;
}
type UI = { openBooking: (prefill?: BookingPrefill) => void; openAssistant: () => void; userId: string };
const UIContext = createContext<UI>({ openBooking: () => {}, openAssistant: () => {}, userId: '' });
export const useWorkspaceUI = () => useContext(UIContext);

const labels: Record<string, [string, string]> = {
  overview: ['Heute', 'Today'],
  calendar: ['Kalender', 'Calendar'],
  appointments: ['Terminliste', 'Appointments'],
  customers: ['Kunden', 'Customers'],
  chat: ['Nachrichten', 'Messages'],
  services: ['Leistungen', 'Services'],
  staff: ['Team', 'Team'],
  availability: ['Arbeitszeiten', 'Working hours'],
  booking: ['Buchungsseite', 'Booking page'],
  analytics: ['Auswertungen', 'Analytics'],
  notifications: ['Erinnerungen', 'Reminders'],
  integrations: ['Website & Kalender', 'Website & calendar'],
  settings: ['Einstellungen', 'Settings'],
  billing: ['Tarif', 'Plan'],
  support: ['Hilfe & Support', 'Help & support'],
};
export const sections = [
  ['overview', Sun],
  ['calendar', CalendarDays],
  ['appointments', CalendarCheck2],
  ['customers', Users],
  ['chat', MessageCircle],
  ['services', Scissors],
  ['staff', UserRound],
  ['availability', Clock3],
  ['booking', Globe2],
  ['analytics', BarChart3],
  ['notifications', Bell],
  ['integrations', Plug],
  ['settings', Settings2],
  ['billing', CreditCard],
  ['support', LifeBuoy],
] as const;
const groups: { title: [string, string]; keys: string[] }[] = [
  { title: ['Täglich', 'Daily'], keys: ['overview', 'calendar', 'customers', 'chat'] },
  { title: ['Einrichten', 'Set up'], keys: ['services', 'staff', 'availability', 'booking'] },
  { title: ['Mehr', 'More'], keys: ['analytics', 'settings', 'support'] },
];
export const staffSections = ['overview', 'calendar', 'appointments', 'chat', 'support'];
export function sectionLabel(key: string, locale: string) {
  return (labels[key] || labels.overview)[locale === 'de' ? 0 : 1];
}
export function DashboardShell(props: {
  workspace: Workspace;
  businesses: Business[];
  user: { id: string; email: string };
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const section = usePathname().split('/')[2] || 'overview';
  return (
    <WorkspaceContext.Provider value={props.workspace}>
      <TutorialProvider page={section}>
        <ShellInner {...props} section={section} />
      </TutorialProvider>
    </WorkspaceContext.Provider>
  );
}
function ShellInner({
  workspace,
  businesses,
  user,
  isAdmin,
  children,
  section,
}: {
  workspace: Workspace;
  businesses: Business[];
  user: { id: string; email: string };
  isAdmin: boolean;
  children: React.ReactNode;
  section: string;
}) {
  const { t, locale } = useI18n(),
    router = useRouter(),
    tutorial = useTutorial();
  const de = locale === 'de';
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState<{ prefill?: BookingPrefill } | null>(null);
  const [assistant, setAssistant] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem('slotdove-dismissed') || '[]'));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAssistant(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const title = sectionLabel(section, locale);
  const canManage = workspace.role !== 'staff';
  async function logout() {
    try {
      await api('/api/auth', 'POST', { action: 'logout' });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error(t.error);
    }
  }
  const announcements = workspace.announcements.filter((a) => !dismissed.includes(a.id));
  const ui: UI = { openBooking: (prefill) => setBooking({ prefill }), openAssistant: () => setAssistant(true), userId: user.id };
  return (
    <UIContext.Provider value={ui}>
      <div className="dashboard-shell">
        {open && <button className="sidebar-scrim" aria-label={t.close} onClick={() => setOpen(false)} />}
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Brand />
          <div className="workspace-switch">
            <span className="avatar">{workspace.business.name.slice(0, 1)}</span>
            <select
              aria-label={t.businessName}
              value={workspace.business.id}
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
          {canManage && (
            <button className="btn btn-primary sidebar-cta" onClick={() => setBooking({})} data-tour="new-booking-side">
              <Plus size={16} /> {de ? 'Neuer Termin' : 'New appointment'}
            </button>
          )}
          <nav className="side-nav">
            {groups.map((g) => {
              const keys = g.keys.filter((k) => canManage || staffSections.includes(k));
              if (!keys.length) return null;
              return (
                <div key={g.title[0]} className="nav-group">
                  <div className="nav-label">{g.title[de ? 0 : 1]}</div>
                  {keys.map((key) => {
                    const Icon = sections.find(([k]) => k === key)![1];
                    const current = section === key || (key === 'settings' && ['notifications', 'integrations', 'billing'].includes(section)) || (key === 'calendar' && section === 'appointments');
                    return (
                      <Link
                        key={key}
                        prefetch
                        aria-current={current ? 'page' : undefined}
                        className={`nav-link ${current ? 'active' : ''}`}
                        href={key === 'overview' ? '/dashboard' : `/dashboard/${key}`}
                        onClick={() => setOpen(false)}
                      >
                        <Icon size={17} strokeWidth={1.7} />
                        {sectionLabel(key, locale)}
                        <NavigationFeedback />
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            {isAdmin && (
              <Link className="nav-link admin-link" href="/admin">
                <ShieldCheck size={16} />
                {de ? 'Admin-Konsole' : 'Admin console'}
              </Link>
            )}
            <button className="help-box" onClick={() => tutorial.start(section)}>
              <LifeBuoy size={16} />
              <span>
                <strong>{de ? 'Hilfe zu dieser Seite' : 'Help for this page'}</strong>
                <small>{de ? 'Kurzes Tutorial starten' : 'Start a short tutorial'}</small>
              </span>
            </button>
            <div className="user-chip">
              <span className="avatar">{user.email.slice(0, 2).toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ellipsis">{user.email.split('@')[0]}</div>
                <small>{workspace.support ? 'Support' : t[workspace.role === 'owner' ? 'owner' : workspace.role === 'admin' ? 'adminRole' : 'staffRole']}</small>
              </div>
              <button onClick={logout} className="btn btn-ghost btn-icon" aria-label={t.logout}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>
        <main className="app-main">
          <header className="topbar">
            <div className="row">
              <button onClick={() => setOpen(true)} className="btn btn-ghost btn-icon mobile-menu" aria-label="Menu">
                <Menu size={18} />
              </button>
              <div className="breadcrumbs">
                <span>{workspace.business.name}</span>
                <ChevronRight size={12} />
                <strong>{title}</strong>
              </div>
            </div>
            <div className="topbar-actions" data-tour="help">
              {workspace.business.is_demo && <span className="badge badge-amber">{t.demo}</span>}
              {workspace.features.some((f) => ['insights_pro', 'new_calendar'].includes(f)) && (
                <span className="badge badge-purple" title={de ? 'Du testest Beta-Funktionen' : 'You are testing beta features'}>
                  <FlaskConical size={12} /> Beta
                </span>
              )}
              {workspace.features.includes('assistant') && (
                <button className="btn btn-ghost btn-icon" onClick={() => setAssistant(true)} title={de ? 'Slotdove KI (Strg/⌘ + K)' : 'Slotdove AI (Ctrl/⌘ + K)'} aria-label={de ? 'Slotdove KI öffnen' : 'Open Slotdove AI'}>
                  <Sparkles size={15} />
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => tutorial.start(section)} aria-label={de ? 'Tutorial für diese Seite' : 'Tutorial for this page'}>
                <CircleHelp size={17} />
                <span className="hide-sm">{de ? 'Anleitung' : 'Guide'}</span>
              </button>
              <Preferences />
            </div>
          </header>
          {workspace.support && (
            <div className="support-banner">
              <ShieldCheck size={16} />
              {de ? `Supportmodus: Du bearbeitest „${workspace.business.name}“ als Plattform-Admin. Alle Änderungen werden protokolliert.` : `Support mode: you are editing “${workspace.business.name}” as platform admin. All changes are logged.`}
              <Link href="/admin" className="btn btn-sm btn-outline">
                {de ? 'Zurück zur Konsole' : 'Back to console'}
              </Link>
            </div>
          )}
          {announcements.map((a) => (
            <div className={`announcement ${a.level}`} key={a.id}>
              <Megaphone size={16} />
              <div>
                <strong>{a.title}</strong>
                {a.body && <span> {a.body}</span>}
              </div>
              <button
                className="btn btn-ghost btn-icon"
                aria-label={t.close}
                onClick={() => {
                  const next = [...dismissed, a.id];
                  setDismissed(next);
                  try {
                    localStorage.setItem('slotdove-dismissed', JSON.stringify(next));
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="app-content page-fade" key={section}>
            {children}
          </div>
        </main>
        {canManage && (
          <button className="fab" onClick={() => setBooking({})} aria-label={de ? 'Neuer Termin' : 'New appointment'}>
            <Plus size={22} />
          </button>
        )}
      </div>
      {booking && <BookingDialog open onClose={() => setBooking(null)} prefill={booking.prefill} />}
      <AssistantPanel open={assistant} onClose={() => setAssistant(false)} />
    </UIContext.Provider>
  );
}
