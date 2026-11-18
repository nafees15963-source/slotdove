'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, X, CalendarPlus, GraduationCap } from 'lucide-react';
import { useI18n } from '../providers';
import { useWorkspace, useWorkspaceUI } from './shell';
import { answer, assistantExamples, type AssistantAnswer } from '@/lib/ai/assistant';
import { useTutorial } from '../tutorial';
import { api } from '@/lib/api-client';

type Remote = { text: string; booking?: { serviceId?: string; staffId?: string; date?: string; time?: string; name?: string; phone?: string }; fallback?: boolean };
/** Tiny, safe markdown: **bold**, lists, line breaks. */
function Rich({ text }: { text: string }) {
  const lines = text.split(/\n+/).filter((l) => l.trim());
  const inline = (l: string) => l.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
  return (
    <>
      {lines.map((l, i) =>
        /^\s*([-*•]|\d+\.)\s+/.test(l) ? (
          <div className="rich-li" key={i}>
            {inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}
          </div>
        ) : (
          <p key={i}>{inline(l)}</p>
        ),
      )}
    </>
  );
}

type Line = { role: 'me' | 'ai'; text: string; result?: AssistantAnswer; smart?: boolean };
/** Slide-over assistant. Runs entirely in the browser on the loaded workspace. */
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const w = useWorkspace(),
    ui = useWorkspaceUI(),
    tutorial = useTutorial(),
    { locale } = useI18n();
  const de = locale === 'de';
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [lines, thinking]);
  async function ask(q: string) {
    if (!q.trim() || thinking) return;
    const history = [...lines, { role: 'me' as const, text: q }];
    setLines(history);
    setValue('');
    setThinking(true);
    try {
      const remote = await api<Remote>('/api/ai', 'POST', {
        business: w.business.id,
        locale,
        messages: history.slice(-12).map((l) => ({ role: l.role === 'me' ? 'user' : 'assistant', content: l.text.slice(0, 4000) })),
      });
      if (remote.fallback) throw new Error('fallback');
      const booking = remote.booking ? { ...remote.booking, understood: [], confidence: 1 } : undefined;
      setLines((l) => [...l, { role: 'ai', text: remote.text, smart: true, result: { text: remote.text, booking } }]);
    } catch {
      // Offline or not configured: the local assistant answers instead.
      const result = answer(q, w, locale);
      setLines((l) => [...l, { role: 'ai', text: result.text, result }]);
    } finally {
      setThinking(false);
    }
  }
  if (!open) return null;
  return (
    <div className="assistant-layer">
      <button className="assistant-scrim" aria-label={de ? 'Schließen' : 'Close'} onClick={onClose} />
      <aside className="assistant" role="dialog" aria-label="Slotdove KI">
        <header>
          <div className="row">
            <span className="ai-orb">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>Slotdove KI</strong>
              <small>{de ? 'Kennt deine Termine, Kunden und Zahlen. Ändert nichts ohne deine Bestätigung.' : 'Knows your appointments, customers and numbers. Changes nothing without your OK.'}</small>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'}>
            <X size={18} />
          </button>
        </header>
        <div className="assistant-body" ref={list}>
          {!lines.length && (
            <div className="assistant-empty">
              <p>{de ? 'Stell mir echte Fragen – zu deinem Kalender, deinen Kunden, deinem Umsatz oder wie du etwas verbesserst. Oder diktier mir einen Termin.' : 'Ask real questions – about your calendar, customers, revenue or how to improve. Or dictate an appointment.'}</p>
              <div className="row wrap">
                {assistantExamples[locale].map((q) => (
                  <button className="chip" key={q} onClick={() => ask(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {lines.map((line, n) => (
            <div key={n} className={`msg ${line.role}`}>
              <div className="msg-bubble">{line.role === 'ai' ? <Rich text={line.text} /> : line.text}</div>
              {line.result && (
                <div className="row wrap msg-actions">
                  {line.result.booking && (
                    <button
                      className="chip on"
                      onClick={() => {
                        onClose();
                        ui.openBooking({ ...line.result!.booking, text: lines[n - 1]?.text });
                      }}
                    >
                      <CalendarPlus size={13} /> {de ? 'Termin prüfen & speichern' : 'Review & save'}
                    </button>
                  )}
                  {line.result.tutorial && (
                    <button
                      className="chip"
                      onClick={() => {
                        onClose();
                        tutorial.start(line.result!.tutorial!);
                      }}
                    >
                      <GraduationCap size={13} /> {de ? 'Tutorial ansehen' : 'Watch tutorial'}
                    </button>
                  )}
                  {line.result.links?.map((l) => (
                    <Link key={l.href + l.label} className="chip" href={l.href} onClick={onClose}>
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="msg ai">
              <div className="msg-bubble typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
        <form
          className="assistant-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask(value);
          }}
        >
          <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={de ? 'Frage oder Termin eingeben …' : 'Ask or type an appointment …'} aria-label={de ? 'Nachricht an die KI' : 'Message to the AI'} />
          <button className="btn btn-primary btn-icon" aria-label={de ? 'Senden' : 'Send'} disabled={!value.trim()}>
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
}
