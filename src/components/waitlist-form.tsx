'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, friendlyError } from '@/lib/api-client';
import { industries } from '@/lib/industries';
import { useI18n } from './providers';

type Plan = 'free' | 'pro' | 'business' | 'unsure';
/** Pre-launch waitlist. Consent is explicit and stored with the entry. */
export function WaitlistForm() {
  const { locale } = useI18n();
  const de = locale === 'de';
  const started = useRef(0);
  const [plan, setPlan] = useState<Plan>('unsure');
  const [interest, setInterest] = useState<'demo' | 'subscription' | 'info'>('demo');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    started.current = Date.now();
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p === 'free' || p === 'pro' || p === 'business') setPlan(p);
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.consent !== 'on') return setError(de ? 'Bitte bestätige die Einwilligung.' : 'Please confirm the consent.');
    setBusy(true);
    try {
      await api('/api/public/waitlist', 'POST', {
        company: f.company,
        contact_name: f.contact_name,
        email: f.email,
        phone: f.phone || '',
        industry: f.industry || 'other',
        city: f.city || '',
        team_size: f.team_size || '',
        plan_interest: plan,
        interest,
        message: f.message || '',
        consent: true,
        locale,
        source: new URLSearchParams(window.location.search).get('utm_source')?.slice(0, 100) || '',
        website: f.website || '',
        started_at: started.current,
      });
      setDone(true);
    } catch (err) {
      setError(friendlyError(err, locale));
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="wl-done">
        <CheckCircle2 size={40} />
        <h3>{de ? 'Danke! Sie stehen auf der Warteliste.' : 'Thanks! You are on the waitlist.'}</h3>
        <p>{de ? 'Wir melden uns persönlich bei Ihnen – in der Regel innerhalb von 1–2 Werktagen.' : 'We will contact you personally – usually within 1–2 business days.'}</p>
      </div>
    );
  const plans: [Plan, string][] = [
    ['free', 'Starter · 5 €'],
    ['pro', 'Pro · 15 €'],
    ['business', 'Business · 25 €'],
    ['unsure', de ? 'Noch unsicher' : 'Not sure yet'],
  ];
  return (
    <form className="wl-form" onSubmit={submit} noValidate={false}>
      <fieldset className="wl-choice">
        <legend>{de ? 'Was möchten Sie?' : 'What would you like?'}</legend>
        {(
          [
            ['demo', de ? '14 Tage kostenlos testen' : '14-day free trial'],
            ['subscription', de ? 'Abo nach dem Start' : 'Subscribe after launch'],
            ['info', de ? 'Erst mal informiert bleiben' : 'Just keep me informed'],
          ] as const
        ).map(([v, label]) => (
          <button type="button" key={v} className={`chip ${interest === v ? 'on' : ''}`} onClick={() => setInterest(v)} aria-pressed={interest === v}>
            {label}
          </button>
        ))}
      </fieldset>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="wl-company">{de ? 'Unternehmen' : 'Company'} *</label>
          <input id="wl-company" name="company" required minLength={2} maxLength={120} autoComplete="organization" />
        </div>
        <div className="field">
          <label htmlFor="wl-name">{de ? 'Ihr Name' : 'Your name'} *</label>
          <input id="wl-name" name="contact_name" required minLength={2} maxLength={100} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="wl-email">{de ? 'E-Mail' : 'Email'} *</label>
          <input id="wl-email" name="email" type="email" required maxLength={254} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="wl-phone">{de ? 'Telefon (optional)' : 'Phone (optional)'}</label>
          <input id="wl-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" pattern="[0-9+()/ .\-]*" />
        </div>
        <div className="field">
          <label htmlFor="wl-industry">{de ? 'Branche' : 'Industry'}</label>
          <select id="wl-industry" name="industry" defaultValue="">
            <option value="" disabled>
              {de ? 'Bitte wählen' : 'Please choose'}
            </option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.emoji} {de ? i.de : i.en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wl-city">{de ? 'Ort' : 'City'}</label>
          <input id="wl-city" name="city" maxLength={80} autoComplete="address-level2" />
        </div>
        <div className="field">
          <label htmlFor="wl-team">{de ? 'Teamgröße' : 'Team size'}</label>
          <select id="wl-team" name="team_size" defaultValue="">
            <option value="">–</option>
            <option value="1">{de ? 'Nur ich' : 'Just me'}</option>
            <option value="2-5">2–5</option>
            <option value="6-15">6–15</option>
            <option value="16+">16+</option>
          </select>
        </div>
        <div className="field full">
          <span className="field-label">{de ? 'Interessanter Tarif' : 'Plan of interest'}</span>
          <div className="row wrap">
            {plans.map(([v, label]) => (
              <button type="button" key={v} className={`chip ${plan === v ? 'on' : ''}`} onClick={() => setPlan(v)} aria-pressed={plan === v}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label htmlFor="wl-msg">{de ? 'Nachricht (optional)' : 'Message (optional)'}</label>
          <textarea id="wl-msg" name="message" maxLength={1000} rows={3} placeholder={de ? 'Was ist Ihnen besonders wichtig?' : 'What matters most to you?'} />
        </div>
        {/* Honeypot: invisible for people, tempting for bots. */}
        <div className="wl-hp" aria-hidden="true">
          <label htmlFor="wl-website">Website</label>
          <input id="wl-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="check-label full wl-consent">
          <input type="checkbox" name="consent" required />
          <span>
            {de
              ? 'Ich bin einverstanden, dass Slotdove mich per E-Mail oder Telefon zur Testphase, zum Start und zu Angeboten kontaktiert. Ich kann das jederzeit widerrufen.'
              : 'I agree that Slotdove may contact me by email or phone about the test phase, the launch and offers. I can withdraw at any time.'}{' '}
            <a href="/privacy" target="_blank" className="purple">
              {de ? 'Datenschutzhinweise' : 'Privacy notice'}
            </a>
          </span>
        </label>
      </div>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-lg wl-submit" disabled={busy}>
        {busy ? <span className="spinner" /> : <ArrowRight size={16} />}
        {de ? 'Auf die Warteliste' : 'Join the waitlist'}
      </button>
    </form>
  );
}
