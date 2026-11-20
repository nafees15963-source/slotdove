import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { Support } from '@/lib/release';

/** Voluntary contribution towards running costs – deliberately not called a donation (no receipt). */
export function SupportCard({ support, de, compact = false }: { support: Support; de: boolean; compact?: boolean }) {
  if (!support.enabled || !support.url) return null;
  return (
    <div className={`support-card ${compact ? 'compact' : ''}`}>
      <span className="support-icon" aria-hidden>
        <Heart size={20} />
      </span>
      <div className="grow">
        <strong>{de ? 'Slotdove freiwillig unterstützen' : 'Support Slotdove voluntarily'}</strong>
        <p>
          {support.text ||
            (de
              ? 'Slotdove ist in der Startphase kostenlos. Wenn du magst, hilfst du mit einem kleinen Betrag, die Server- und E-Mail-Kosten zu decken.'
              : 'Slotdove is free during the launch phase. If you like, a small amount helps cover server and email costs.')}
        </p>
        <small className="muted">
          {de
            ? 'Freiwillig, ohne Gegenleistung und ohne Einfluss auf deine Nutzung. Keine Spendenquittung, nicht steuerlich absetzbar.'
            : 'Voluntary, no consideration, no effect on your access. No donation receipt.'}{' '}
          <Link href="/unterstuetzen">{de ? 'Mehr erfahren' : 'Learn more'}</Link>
        </small>
      </div>
      <a className="btn btn-primary" href={support.url} target="_blank" rel="noopener noreferrer nofollow">
        <Heart size={15} /> {de ? 'Unterstützen' : 'Support'}
      </a>
    </div>
  );
}
