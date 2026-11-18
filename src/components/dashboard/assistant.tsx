'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, X, CalendarPlus, GraduationCap } from 'lucide-react';
import { useI18n } from '../providers';
import { useWorkspace, useWorkspaceUI } from './shell';
import { answer, assistantExamples, type AssistantAnswer } from '@/lib/ai/assistant';
import { useTutorial } from '../tutorial';

type Line = { role: 'me' | 'ai'; text: string; result?: AssistantAnswer };
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
  function ask(q: string) {
    if (!q.trim()) return;
    setLines((l) => [...l, { role: 'me', text: q }]);
    setValue('');
    setThinking(true);
    // A short pause makes the answer feel considered and lets the UI breathe.
    setTimeout(() => {
      const result = answer(q, w, locale);
      setLines((l) => [...l, { role: 'ai', text: result.text, result }]);
      setThinking(false);
    }, 380);
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
              <small>{de ? 'Läuft lokal in deinem Browser – keine Daten verlassen das Gerät.' : 'Runs locally in your browser – no data leaves your device.'}</small>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={de ? 'Schließen' : 'Close'}>
            <X size={18} />
          </button>
        </header>
        <div className="assistant-body" ref={list}>
          {!lines.length && (
            <div className="assistant-empty">
              <p>{de ? 'Frag mich nach deinem Kalender, deinen Zahlen oder wie etwas funktioniert. Oder diktier mir einen Termin.' : 'Ask about your calendar, your numbers or how something works. Or dictate an appointment.'}</p>
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
              <div className="msg-bubble" style={{ whiteSpace: 'pre-line' }}>
                {line.text}
              </div>
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
