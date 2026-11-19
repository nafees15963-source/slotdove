'use client';
import Link from 'next/link';
import { useI18n } from '../providers';
const tabs: [string, string, string][] = [
  ['settings', 'Allgemein', 'General'],
  ['notifications', 'Erinnerungen', 'Reminders'],
  ['integrations', 'Website & Kalender', 'Website & calendar'],
  ['billing', 'Tarif', 'Plan'],
];
export const settingsSections = tabs.map((t) => t[0]);
/** Groups the less frequent setup pages under one navigation entry. */
export function SettingsTabs({ section }: { section: string }) {
  const { locale } = useI18n();
  return (
    <nav className="sub-tabs" aria-label={locale === 'de' ? 'Einstellungen' : 'Settings'}>
      {tabs.map(([key, de, en]) => (
        <Link key={key} href={`/dashboard/${key}`} className={section === key ? 'on' : ''} aria-current={section === key ? 'page' : undefined}>
          {locale === 'de' ? de : en}
        </Link>
      ))}
    </nav>
  );
}
