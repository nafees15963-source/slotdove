'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Flag, LifeBuoy, MessageCircle, Send, ShieldAlert, Users, UserRound } from 'lucide-react';
import { useWorkspace, useWorkspaceUI } from './shell';
import { useI18n } from '../providers';
import { api, friendlyError } from '@/lib/api-client';
import { moderate } from '@/lib/ai/moderation';
import { Heading } from './common';

type Conversation = { id: string; kind: 'team' | 'support' | 'customer'; booking_id: string | null; customer_name: string; last_message_at: string };
type Message = { id: string; sender_kind: string; sender_id: string | null; sender_name: string; body: string; hidden: boolean; created_at: string };
export function Chat() {
  const w = useWorkspace(),
    ui = useWorkspaceUI(),
    { locale } = useI18n(),
    params = useSearchParams();
  const de = locale === 'de';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [current, setCurrent] = useState<string | null>(params.get('c'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const loadConversations = useCallback(async () => {
    try {
      const r = await api<{ conversations: Conversation[] }>(`/api/chat?business=${w.business.id}`);
      setConversations(r.conversations);
      setCurrent((c) => c || r.conversations.find((x) => x.kind === 'team')?.id || r.conversations[0]?.id || null);
    } catch {
      setUnavailable(true);
    }
  }, [w.business.id]);
  const loadMessages = useCallback(async () => {
    if (!current) return;
    try {
      const r = await api<{ messages: Message[] }>(`/api/chat?business=${w.business.id}&conversation=${current}`);
      setMessages((prev) => (prev.length === r.messages.length && prev.at(-1)?.id === r.messages.at(-1)?.id ? prev : r.messages));
    } catch {
      /* keep the last state while offline */
    }
  }, [current, w.business.id]);
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    setMessages([]);
    void loadMessages();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadMessages]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);
  const check = text.trim() ? moderate(text) : null;
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !current) return;
    setSending(true);
    try {
      const r = await api<{ message: Message }>('/api/chat', 'POST', { business: w.business.id, conversation: current, text });
      setMessages((m) => [...m, r.message]);
      setText('');
    } catch (err) {
      toast.error(friendlyError(err, locale));
    } finally {
      setSending(false);
    }
  }
  async function report(m: Message) {
    const reason = prompt(de ? 'Warum meldest du diese Nachricht? (optional)' : 'Why are you reporting this message? (optional)');
    if (reason === null) return;
    try {
      await api('/api/chat', 'POST', { business: w.business.id, action: 'report', message: m.id, reason });
      toast.success(de ? 'Danke! Unser Team prüft die Nachricht.' : 'Thanks! Our team will review it.');
    } catch (err) {
      toast.error(friendlyError(err, locale));
    }
  }
  const conv = conversations.find((c) => c.id === current);
  const titleOf = (c: Conversation) => (c.kind === 'team' ? (de ? 'Team-Chat' : 'Team chat') : c.kind === 'support' ? (de ? 'Slotdove-Support' : 'Slotdove support') : c.customer_name || (de ? 'Kunde' : 'Customer'));
  const iconOf = (c: Conversation) => (c.kind === 'team' ? Users : c.kind === 'support' ? LifeBuoy : UserRound);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(iso));
  return (
    <>
      <Heading title={de ? 'Nachrichten' : 'Messages'} description={de ? 'Team, Kunden und Support an einem Ort. Nachrichten werden automatisch auf Beleidigungen und Betrug geprüft.' : 'Team, customers and support in one place. Messages are screened for abuse and scams.'} />
      {unavailable ? (
        <div className="notice">{de ? 'Der Chat ist gerade nicht erreichbar. Bitte versuche es später erneut.' : 'Chat is unavailable right now.'}</div>
      ) : (
        <div className="chat">
          <aside className="chat-list">
            {conversations.map((c) => {
              const Icon = iconOf(c);
              return (
                <button key={c.id} className={`chat-item ${c.id === current ? 'on' : ''}`} onClick={() => setCurrent(c.id)}>
                  <span className={`chat-icon ${c.kind}`}>
                    <Icon size={16} />
                  </span>
                  <span className="grow">
                    <strong>{titleOf(c)}</strong>
                    <small>{c.kind === 'customer' ? (de ? 'Kundenchat' : 'Customer chat') : c.kind === 'support' ? (de ? 'Hilfe vom Slotdove-Team' : 'Help from Slotdove') : de ? 'Nur für dein Team' : 'Team only'}</small>
                  </span>
                </button>
              );
            })}
            {!conversations.length && <p className="muted" style={{ padding: 16 }}>{de ? 'Wird geladen …' : 'Loading …'}</p>}
            <p className="chat-hint">{de ? 'Kundenchats startest du im Termin über „Nachricht senden“.' : 'Start customer chats from an appointment via “Send message”.'}</p>
          </aside>
          <section className="chat-main">
            <header>
              {conv ? (
                <>
                  <strong>{titleOf(conv)}</strong>
                  <small>{conv.kind === 'customer' ? (de ? 'Der Kunde sieht diese Nachrichten über seinen privaten Terminlink.' : 'The customer sees these via their private link.') : ''}</small>
                </>
              ) : (
                <strong>…</strong>
              )}
            </header>
            <div className="chat-messages" ref={list}>
              {!messages.length && (
                <div className="chat-empty">
                  <MessageCircle size={28} />
                  <p>{conv?.kind === 'support' ? (de ? 'Schreib uns – wir helfen gern.' : 'Write to us – we are happy to help.') : de ? 'Noch keine Nachrichten.' : 'No messages yet.'}</p>
                </div>
              )}
              {messages.map((m) => {
                const own = m.sender_kind === 'member' && m.sender_id === ui.userId;
                return (
                  <div key={m.id} className={`bubble-row ${m.sender_kind} ${own ? 'own' : ''}`}>
                    <div className="bubble">
                      <div className="bubble-meta">
                        <strong>{m.sender_kind === 'admin' ? '🛡️ ' : ''}{m.sender_name || (de ? 'Kunde' : 'Customer')}</strong>
                        <time>{fmt(m.created_at)}</time>
                      </div>
                      {m.hidden ? <em className="muted">{de ? 'Nachricht wurde von der Moderation ausgeblendet.' : 'Message hidden by moderation.'}</em> : <p>{m.body}</p>}
                    </div>
                    {!m.hidden && m.sender_kind !== 'admin' && (
                      <button className="report-btn" onClick={() => report(m)} title={de ? 'Melden' : 'Report'} aria-label={de ? 'Nachricht melden' : 'Report message'}>
                        <Flag size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <form className="chat-input" onSubmit={send}>
              {check?.flagged && (
                <div className="chat-warn">
                  <ShieldAlert size={14} /> {de ? 'Diese Nachricht könnte als unangemessen markiert werden.' : 'This message may be flagged as inappropriate.'}
                </div>
              )}
              <textarea
                value={text}
                rows={1}
                maxLength={4000}
                placeholder={de ? 'Nachricht schreiben …' : 'Write a message …'}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget.form as HTMLFormElement).requestSubmit();
                  }
                }}
                aria-label={de ? 'Nachricht' : 'Message'}
              />
              <button className="btn btn-primary btn-icon" disabled={sending || !text.trim() || !current} aria-label={de ? 'Senden' : 'Send'}>
                {sending ? <span className="spinner" /> : <Send size={16} />}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
