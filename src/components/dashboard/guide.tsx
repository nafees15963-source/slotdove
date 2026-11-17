'use client';
import { useI18n } from '../providers';
import { CalendarDays, Scissors, Users, Clock3 } from 'lucide-react';
import Link from 'next/link';

export function WorkspaceGuide() {
  const { locale } = useI18n();
  const de = locale === 'de';
  const steps = [
    {
      icon: Scissors,
      path: 'services',
      title: de ? '1. Leistung anlegen' : '1. Add a service',
      text: de
        ? 'Lege Dauer und Preis fest. Puffer sind Zeit vor oder nach einem Termin.'
        : 'Set duration and price. Buffers reserve time before or after an appointment.',
    },
    {
      icon: Users,
      path: 'staff',
      title: de ? '2. Zuständigkeit festlegen' : '2. Assign responsibility',
      text: de
        ? 'Optional: Wähle, wer die Leistung anbietet. Du kannst Termine auch zuerst ohne Zuordnung anlegen.'
        : 'Choose who offers the service. A profile does not need a user account.',
    },
    {
      icon: Clock3,
      path: 'availability',
      title: de ? '3. Wochenplan erstellen' : '3. Set working hours',
      text: de
        ? 'Arbeitszeiten geben freie Zeiten vor. Sperrzeiten halten Pausen und Urlaub frei.'
        : 'Working hours define availability. Blocks reserve breaks and holidays.',
    },
    {
      icon: CalendarDays,
      path: 'appointments',
      title: de ? '4. Termin eintragen' : '4. Create an appointment',
      text: de
        ? 'Leistung, Datum und Uhrzeit wählen. Die Zeit gilt in der Zeitzone deines Unternehmens.'
        : 'Choose a service, date and time in your business time zone.',
    },
  ];
  return (
    <details className="workspace-guide">
      <summary>{de ? 'So funktioniert dein Kalender' : 'How your calendar works'}</summary>
      <div className="guide-grid">
        {steps.map(({ icon: Icon, ...step }) => (
          <Link href={`/dashboard/${step.path}`} key={step.path}>
            <Icon size={24} />
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </Link>
        ))}
      </div>
    </details>
  );
}
