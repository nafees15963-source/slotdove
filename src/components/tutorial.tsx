'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, X } from 'lucide-react';
import { useI18n } from './providers';
import { tutorials, type Visual } from '@/lib/tutorials';

type Ctx = { start: (id: string) => void; active: string | null };
const TutorialContext = createContext<Ctx>({ start: () => {}, active: null });
export const useTutorial = () => useContext(TutorialContext);
const OFF_KEY = 'slotdove-tours-off';
function toursOff() {
  try {
    return localStorage.getItem(OFF_KEY) === '1' || localStorage.getItem('slotdove-tour-overview') === '1';
  } catch {
    return true;
  }
}
/** Closing a tutorial (X, Escape or "OK") switches automatic tutorials off for good,
 * on this device and in the user profile. The "Anleitung" button still opens them. */
function switchOff() {
  try {
    localStorage.setItem(OFF_KEY, '1');
  } catch {
    /* private mode */
  }
  void fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutorials_off: true }) }).catch(() => null);
}
/** Provides tutorials for every page. Only the welcome tour starts on its own, once. */
export function TutorialProvider({ children, page, autoStart = true, disabled = false }: { children: ReactNode; page: string; autoStart?: boolean; disabled?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const start = useCallback((id: string) => setActive(tutorials[id] ? id : 'overview'), []);
  useEffect(() => {
    if (!autoStart || disabled || page !== 'overview' || toursOff()) return;
    const timer = setTimeout(() => setActive('overview'), 700);
    return () => clearTimeout(timer);
  }, [page, autoStart, disabled]);
  return (
    <TutorialContext.Provider value={{ start, active }}>
      {children}
      {active && (
        <TutorialPlayer
          id={active}
          onClose={() => {
            switchOff();
            setActive(null);
          }}
        />
      )}
    </TutorialContext.Provider>
  );
}
function TutorialPlayer({ id, onClose }: { id: string; onClose: () => void }) {
  const { locale } = useI18n();
  const i = locale === 'de' ? 0 : 1;
  const tut = tutorials[id];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const current = tut.steps[step];
  useLayoutEffect(() => {
    const el = current.target ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`) : null;
    if (!el) {
      setRect(null);
      return;
    }
    // Jump (no smooth scroll) so the highlight never slides while measuring.
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, [current]);
  useEffect(() => {
    // The page must not scroll underneath an open tutorial.
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, tut.steps.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, tut.steps.length]);
  const last = step === tut.steps.length - 1;
  // The card stays in one fixed place; only the spotlight moves to the highlighted element.
  const dock = rect && typeof window !== 'undefined' ? (rect.top + rect.height / 2 > window.innerHeight / 2 ? 'top' : 'bottom') : 'center';
  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label={tut.title[i]}>
      {rect ? (
        <div
          className="tour-spotlight"
          style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      ) : (
        <div className="tour-backdrop" onClick={onClose} />
      )}
      <div className={`tour-card dock-${dock}`} key={step}>
        <button className="tour-close" onClick={onClose} aria-label={locale === 'de' ? 'Tutorial schließen' : 'Close tutorial'}>
          <X size={16} />
        </button>
        <TutorialVisual kind={current.visual} />
        <div className="tour-body">
          <div className="tour-kicker">
            {tut.title[i]} · {step + 1}/{tut.steps.length}
          </div>
          <h3>{current.title[i]}</h3>
          <p>{current.text[i]}</p>
        </div>
        <div className="tour-foot">
          <div className="tour-dots">
            {tut.steps.map((_, n) => (
              <button key={n} className={n === step ? 'on' : ''} onClick={() => setStep(n)} aria-label={`${n + 1}`} />
            ))}
          </div>
          <div className="row">
            {step > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} />
              </button>
            )}
            <button className="btn btn-primary btn-sm" autoFocus onClick={() => (last ? onClose() : setStep(step + 1))}>
              {last ? (
                <>
                  <Check size={14} /> {locale === 'de' ? 'OK, verstanden' : 'OK, got it'}
                </>
              ) : (
                <>
                  {locale === 'de' ? 'Weiter' : 'Next'} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/** Small animated illustrations, pure CSS/SVG. */
export function TutorialVisual({ kind, compact = false }: { kind: Visual; compact?: boolean }) {
  const cls = `viz viz-${kind} ${compact ? 'viz-compact' : ''}`;
  switch (kind) {
    case 'quick-add':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-input">
            <span className="viz-typing">Morgen 14:00 Haarschnitt Anna</span>
          </div>
          <div className="viz-chips">
            <span>📅 Do</span>
            <span>🕑 14:00</span>
            <span>✂️ Haarschnitt</span>
            <span>👤 Anna</span>
          </div>
        </div>
      );
    case 'calendar':
    case 'assign':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-cal">
            {Array.from({ length: 14 }, (_, n) => (
              <div key={n} className="viz-cal-cell">
                {[2, 5, 9].includes(n) && <span className="viz-ev" />}
                {n === 7 && <span className={`viz-ev ${kind === 'assign' ? 'dashed' : 'alt'}`} />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'week-plan':
    case 'holiday':
      return (
        <div className={cls} aria-hidden>
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d, n) => (
            <div className="viz-week-row" key={d}>
              <span className={`viz-toggle ${n < 5 ? 'on' : ''}`} />
              <b>{d}</b>
              <span className="viz-bar" style={{ opacity: n < 5 ? 1 : 0.15 }}>
                {n < 5 && <span className="viz-break" />}
              </span>
              {kind === 'holiday' && n === 2 && <span className="viz-flag">🎄</span>}
            </div>
          ))}
        </div>
      );
    case 'buffer':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-timeline">
            <span className="viz-buf">10′</span>
            <span className="viz-appt">Termin 45′</span>
            <span className="viz-buf">10′</span>
          </div>
          <small>Vorbereitung · Termin · Puffer danach</small>
        </div>
      );
    case 'slot-grid':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-slots">
            {['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45'].map((s, n) => (
              <span key={s} className={n === 2 ? 'pick' : n === 5 ? 'busy' : ''}>
                {s}
              </span>
            ))}
          </div>
        </div>
      );
    case 'share-link':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-phone">
            <div className="viz-phone-head" />
            <span />
            <span />
            <span className="cta" />
          </div>
          <div className="viz-link">slotdove.app/b/dein-studio</div>
        </div>
      );
    case 'chat':
    case 'report':
    case 'support':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-bubble in">Hallo! Ich komme 5 Min. später 🙏</div>
          <div className="viz-bubble out">Kein Problem, bis gleich!</div>
          {kind === 'report' && <div className="viz-bubble in flagged">⚑ zur Prüfung markiert</div>}
          {kind === 'support' && <div className="viz-bubble in support">Slotdove Support: Wie können wir helfen?</div>}
        </div>
      );
    case 'stats':
    case 'ai':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-bars">
            {[40, 65, 50, 85, 70, 95, 30].map((h, n) => (
              <span key={n} style={{ height: `${h}%`, animationDelay: `${n * 80}ms` }} />
            ))}
          </div>
          {kind === 'ai' && <div className="viz-spark">✨ Freitag ist dein stärkster Tag</div>}
        </div>
      );
    case 'plans':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-plans">
            <span>5 €</span>
            <span className="hot">15 €</span>
            <span>25 €</span>
          </div>
        </div>
      );
    case 'customers':
    case 'team':
      return (
        <div className={cls} aria-hidden>
          {['AM', 'JW', 'SK'].map((n, k) => (
            <div className="viz-person" key={n} style={{ animationDelay: `${k * 120}ms` }}>
              <span className="avatar">{n}</span>
              <span className="viz-line" />
            </div>
          ))}
        </div>
      );
    case 'bell':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-mail">✉️ Erinnerung: Morgen 10:00</div>
          <div className="viz-mail late">✉️ Dein Termin ist bestätigt</div>
        </div>
      );
    case 'booking-form':
    case 'settings':
      return (
        <div className={cls} aria-hidden>
          <div className="viz-form">
            <span />
            <span />
            <span className="short" />
            <b />
          </div>
        </div>
      );
    default:
      return (
        <div className={`${cls} viz-welcome`} aria-hidden>
          <div className="viz-logo">🕊️</div>
          <div className="viz-orbit" />
        </div>
      );
  }
}
/** Little “i” next to a label, opens an explanation with an optional visual. */
export function InfoTip({ text, visual, label }: { text: string; visual?: Visual; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="infotip" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={label || 'Info'}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={13} />
      </button>
      {open && (
        <span className="infotip-pop" role="tooltip">
          {visual && <TutorialVisual kind={visual} compact />}
          <span>{text}</span>
        </span>
      )}
    </span>
  );
}
