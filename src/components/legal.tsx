import Link from 'next/link';
import type { ReactNode } from 'react';
import { MarketingNav, MarketingFooter } from './marketing';

/** Highlighted gap the operator must fill in before going live. */
export const Ph = ({ children }: { children: ReactNode }) => <span className="placeholder">[{children}]</span>;

export const LEGAL_UPDATED = '20. November 2026';

export function LegalPage({ title, children, toc }: { title: string; children: ReactNode; toc?: [string, string][] }) {
  return (
    <>
      <MarketingNav />
      <main className="legal">
        <nav className="legal-nav" aria-label="Rechtliches">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutzerklärung</Link>
          <Link href="/agb">AGB</Link>
          <Link href="/avv">Auftragsverarbeitung (AVV)</Link>
          <Link href="/melden">Inhalte melden</Link>
        </nav>
        <h1>{title}</h1>
        <p className="meta">Stand: {LEGAL_UPDATED}</p>
        {toc && (
          <div className="toc">
            <strong>Inhalt</strong>
            <ol>
              {toc.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </div>
        )}
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
