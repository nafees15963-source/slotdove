'use client';
import Link from 'next/link';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Sparkles, ArrowRight } from 'lucide-react';

/** Deterministic, local recommendations; no external model or data transfer. */
export function PlanningAssistant() {
  const w = useWorkspace();
  const { locale } = useI18n();
  const de = locale === 'de';
  const unassigned = w.bookings.filter((b) => !b.staff_id && ['pending', 'confirmed'].includes(b.status)).length;
  const missing = w.services.filter((s) => s.active && !w.assignments.some((a) => a.service_id === s.id)).length;
  const tips = [
    ...(unassigned ? [{ href: 'appointments', text: de ? `${unassigned} Termine warten auf eine Zuordnung.` : `${unassigned} appointments need assignment.` }] : []),
    ...(missing ? [{ href: 'services', text: de ? `${missing} Leistungen haben noch kein zugeordnetes Teammitglied für Onlinebuchungen.` : `${missing} services need a team member for online booking.` }] : []),
    ...(!w.business.published ? [{ href: 'booking', text: de ? 'Deine Buchungsseite ist noch nicht veröffentlicht.' : 'Your booking page is not published yet.' }] : []),
  ];
  return <details className="workspace-guide"><summary><Sparkles size={16} style={{ display: 'inline', marginRight: 8 }} />{de ? 'Planungsassistent' : 'Planning assistant'}</summary><p>{de ? 'Lokale Hinweise aus den aktuell geladenen Daten. Es werden keine Änderungen automatisch vorgenommen.' : 'Local suggestions from currently loaded data. Nothing is changed automatically.'}</p><div className="stack">{tips.length ? tips.map((tip) => <Link className="row" key={tip.href} href={`/dashboard/${tip.href}`}>{tip.text}<ArrowRight size={16} /></Link>) : <p>{de ? 'Aktuell gibt es keine offenen Einrichtungshinweise.' : 'No setup suggestions right now.'}</p>}</div></details>;
}
