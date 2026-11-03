'use client';
import { useTheme } from 'next-themes';
import { Moon, Sun, Globe2 } from 'lucide-react';
import { useI18n } from './providers';
import { useRouter, usePathname } from 'next/navigation';
export function Preferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter(),
    path = usePathname();
  return (
    <div className="preferences">
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          document.cookie = `slotdove-locale=${locale === 'de' ? 'en' : 'de'};path=/;max-age=31536000;SameSite=Lax`;
          if (['/', '/de', '/en'].includes(path)) router.push(locale === 'de' ? '/en' : '/de');
          else router.refresh();
        }}
        aria-label={locale === 'en' ? 'Switch to German' : 'Auf Englisch wechseln'}
      >
        <Globe2 size={15} />
        {locale.toUpperCase()}
      </button>
      <button
        className="btn btn-ghost btn-icon"
        aria-label={t.theme}
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="dark-only" size={17} />
        <Moon className="light-only" size={17} />
      </button>
    </div>
  );
}
