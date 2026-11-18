'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api, friendlyError } from '@/lib/api-client';
import { useI18n } from './providers';
type Message = { id: string; sender_kind: string; sender_name: string; body: string; created_at: string };
/** Chat on the customer's private appointment page. */
export function CustomerChat({ token, business }: { token: string; business: string }) {
  const { locale } = useI18n();
  const de = locale === 'de';
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const r = await api<{ messages: Message[] }>('/api/public/chat', 'POST', { token, action: 'list' });
      setMessages(r.messages);
      if (r.messages.length) setOpen(true);
    } catch {
      /* chat optional */
    }
  }, [token]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => list.current?.scrollTo({ top: list.current.scrollHeight }), [messages.length]);
  if (!open)
    return (
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        <MessageCircle size={15} /> {de ? `Nachricht an ${business}` : `Message ${business}`}
      </button>
    );
  return (
    <div className="customer-chat">
      <strong>
        <MessageCircle size={15} /> {de ? `Chat mit ${business}` : `Chat with ${business}`}
      </strong>
      <div className="chat-messages" ref={list}>
        {!messages.length && <p className="muted">{de ? 'Fragen zum Termin? Schreib hier.' : 'Questions about your appointment? Write here.'}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble-row ${m.sender_kind} ${m.sender_kind === 'customer' ? 'own' : ''}`}>
            <div className="bubble">
              <div className="bubble-meta">
                <strong>{m.sender_kind === 'customer' ? (de ? 'Du' : 'You') : m.sender_name || business}</strong>
                <time>{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(m.created_at))}</time>
              </div>
              <p>{m.body}</p>
            </div>
            {m.sender_kind !== 'customer' && (
              <button
                className="report-btn"
                aria-label={de ? 'Melden' : 'Report'}
                onClick={async () => {
                  if (!confirm(de ? 'Diese Nachricht melden?' : 'Report this message?')) return;
                  await api('/api/public/chat', 'POST', { token, action: 'report', message: m.id }).catch(() => null);
                  toast.success(de ? 'Gemeldet. Danke!' : 'Reported. Thank you!');
                }}
              >
                <Flag size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setBusy(true);
          try {
            const r = await api<{ message: Message }>('/api/public/chat', 'POST', { token, action: 'send', text });
            setMessages((m) => [...m, r.message]);
            setText('');
          } catch (err) {
            toast.error(friendlyError(err, locale));
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea rows={1} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={de ? 'Nachricht …' : 'Message …'} aria-label={de ? 'Nachricht' : 'Message'} />
        <button className="btn btn-primary btn-icon" disabled={busy || !text.trim()} aria-label={de ? 'Senden' : 'Send'}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
