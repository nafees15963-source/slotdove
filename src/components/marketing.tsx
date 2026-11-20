import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { Button } from './ui/button';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { marketing } from '@/lib/i18n/marketing';
export async function MarketingNav() {
  const t = await getMessages();
  return (
    <div className="market-container">
      <nav className="market-nav">
        <Brand />
        <details className="mobile-site-menu">
          <summary aria-label="Navigation">☰</summary>
          <div>
            <Link href="/#features">{t.product}</Link>
            <Link href="/#features">{t.features}</Link>
            <Link href="/#solutions">{t.solutions}</Link>
            <Link href="/#pricing">{t.pricing}</Link>
            <Link href="/login">{t.login}</Link>
          </div>
        </details>
        <div className="market-links">
          <Link href="/#features">{t.product}</Link>
          <Link href="/#features">{t.features}</Link>
          <Link href="/#solutions">{t.solutions}</Link>
          <Link href="/#pricing">{t.pricing}</Link>
        </div>
        <div className="market-nav-actions">
          <Preferences />
          <Button variant="ghost" asChild>
            <Link href="/login">{t.login}</Link>
          </Button>
          <Button asChild>
            <Link href="/#warteliste">
              {t.start === 'Jetzt starten' ? 'Frühzugang' : 'Early access'}
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}
export async function MarketingFooter() {
  const locale = await getLocale(),
    t = await getMessages(),
    m = marketing[locale];
  return (
    <footer className="market-footer">
      <div className="market-container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>{m.footer}</p>
          </div>
          <div className="footer-links">
            <div>
              <strong>{m.productLinks}</strong>
              <Link href="/#features">{t.features}</Link>
              <Link href="/#pricing">{t.pricing}</Link>
              <Link href="/#warteliste">{t.start}</Link>
            </div>
            <div>
              <strong>{m.companyLinks}</strong>
              <Link href="/about">{t.about}</Link>
              <Link href="/contact">{t.contact}</Link>
              <Link href="/admin/login">
                {locale === 'de' ? 'Plattformverwaltung' : 'Platform administration'}
              </Link>
              <Link href="/#faq">{t.faq}</Link>
            </div>
            <div>
              <strong>{m.legalLinks}</strong>
              <Link href="/datenschutz">{t.privacy}</Link>
              <Link href="/agb">{t.terms}</Link>
              <Link href="/impressum">{t.legal}</Link>
              <Link href="/avv">AVV</Link>
              <Link href="/unterstuetzen">{t.legal === 'Impressum' ? 'Unterstützen' : 'Support us'}</Link>
              <Link href="/melden">{t.legal === 'Impressum' ? 'Inhalte melden' : 'Report content'}</Link>
            </div>
          </div>
        </div>
        <p className="footer-project">
          {locale === 'de'
            ? '„Slotdove“ ist der Projektname eines privaten, nicht-kommerziellen Testprojekts. Die Nutzung ist kostenlos, es wird kein Geld verlangt. Bereitstellung ohne Gewähr.'
            : '“Slotdove” is the name of a private, non-commercial test project. Use is free of charge; no money is requested. Provided without warranty.'}
        </p>
        <div className="footer-bottom">
          <span>{m.rights}</span>
          <Preferences />
        </div>
      </div>
    </footer>
  );
}
