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
          const next = locale === 'de' ? 'en' : 'de';
          document.cookie = `slotdove-locale=${next};path=/;max-age=31536000;SameSite=Lax`;
          // A full load is needed: the root layout (and its language context) is
          // not re-rendered on client-side navigation.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload needed (see above)
          if (['/', '/de', '/en'].includes(path)) window.location.assign(`/${next}`);
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
        <span className="icon-swap theme-swap" aria-hidden>
          <Sun className="swap-sun" size={17} />
          <Moon className="swap-moon" size={17} />
        </span>
      </button>
    </div>
  );
}
