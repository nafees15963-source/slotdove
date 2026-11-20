import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing';
import { getLocale, getMessages } from '@/lib/i18n/server';
const industries = {
  beauty: {
    en: [
      'Beautiful appointments. Beautiful days.',
      'Give every haircut, treatment, and consultation its own time. Assign qualified staff and protect the preparation and cleanup time between clients.',
    ],
    de: [
      'Schöne Termine. Schöne Tage.',
      'Gib jedem Haarschnitt, jeder Behandlung und jeder Beratung ihren eigenen Raum. Ordne passende Mitarbeitende zu und plane Vorbereitungs- und Aufräumzeiten ein.',
    ],
  },
  consultants: {
    en: [
      'A clearer calendar for clearer thinking.',
      'Let clients book discovery calls and consulting sessions in your available hours. Keep a customer history and focus on your next conversation.',
    ],
    de: [
      'Ein klarer Kalender für klare Gedanken.',
      'Lass Kunden Kennenlerngespräche und Beratungen in deinen freien Zeiten buchen. Behalte ihre Terminhistorie im Blick und konzentriere dich auf das nächste Gespräch.',
    ],
  },
  coaches: {
    en: [
      'Make time for meaningful progress.',
      'Create distinct sessions, set your boundaries, and give each client a simple route to their next appointment.',
    ],
    de: [
      'Zeit für echte Fortschritte.',
      'Lege verschiedene Sitzungen an, setze deine zeitlichen Grenzen und gib jedem Kunden einen einfachen Weg zum nächsten Termin.',
    ],
  },
  fitness: {
    en: [
      'A stronger rhythm for your studio.',
      'Manage one-to-one training appointments with staff-specific hours, preparation buffers, and clear availability. Group classes are not part of this initial release.',
    ],
    de: [
      'Ein besserer Rhythmus für dein Studio.',
      'Verwalte persönliche Trainingstermine mit individuellen Teamzeiten, Vorbereitungspuffern und klarer Verfügbarkeit. Gruppenkurse gehören noch nicht zu dieser ersten Version.',
    ],
  },
  tutors: {
    en: [
      'More learning. Less scheduling.',
      'Let students book individual lessons, protect preparation time, and keep upcoming sessions together.',
    ],
    de: [
      'Mehr Lernen. Weniger Terminabsprachen.',
      'Lass Lernende Einzelstunden buchen, plane Vorbereitungszeit ein und behalte kommende Unterrichtstermine zusammen im Blick.',
    ],
  },
  freelancers: {
    en: [
      'Your work, with room to breathe.',
      'Offer consultations, project reviews, and individual services through one booking link. Choose your hours and stay in control of your day.',
    ],
    de: [
      'Deine Arbeit. Mit Raum zum Atmen.',
      'Biete Beratungen, Projektbesprechungen und individuelle Leistungen über einen Buchungslink an. Bestimme deine Arbeitszeiten und behalte deinen Tag in der Hand.',
    ],
  },
};
export default async function Page({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  if (!(industry in industries)) notFound();
  const locale = await getLocale(),
    t = await getMessages(),
    [title, description] = industries[industry as keyof typeof industries][locale];
  return (
    <>
      <MarketingNav />
      <main className="market-container marketing-section">
        <div className="section-intro">
          <div className="eyebrow">{t.solutions}</div>
          <h1 style={{ margin: '25px 0' }}>{title}</h1>
          <p>{description}</p>
          <Link className="btn btn-primary btn-lg" style={{ marginTop: 30 }} href="/#warteliste">
            {t.start}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid-3">
          {[t.services, t.availability, t.booking].map((label) => (
            <div className="panel panel-body" key={label}>
              <Check className="purple" size={22} />
              <h3 style={{ marginTop: 20 }}>{label}</h3>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
