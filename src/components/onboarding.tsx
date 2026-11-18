'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
import { useI18n } from './providers';
import { api, friendlyError } from '@/lib/api-client';
import { industries, hourPresets, type HourPreset } from '@/lib/industries';
import { Preferences } from './preferences';
/** Three short steps; everything else gets sensible defaults and can be changed later. */
export function Onboarding({ email }: { email: string }) {
  const { locale } = useI18n(),
    router = useRouter();
  const de = locale === 'de';
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [hours, setHours] = useState<HourPreset>('weekdays');
  const [template, setTemplate] = useState(true);
  const [language, setLanguage] = useState<'de' | 'en'>(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chosen = industries.find((i) => i.id === industry);
  const slug = useMemo(
    () =>
      name
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40),
    [name],
  );
  async function finish() {
    setBusy(true);
    setError('');
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
      const result = await api<{ id: string }>('/api/businesses', 'POST', {
        name,
        industry: industry || 'other',
        email,
        timezone: tz,
        currency: 'EUR',
        locale: language,
        description: '',
        phone: '',
        address: '',
        use_template: template,
        hours,
        owner_name: ownerName || undefined,
      });
      document.cookie = `slotdove-business=${result.id};path=/;SameSite=Lax`;
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError(friendlyError(e, locale));
      setBusy(false);
    }
  }
  const steps = [de ? 'Branche' : 'Industry', de ? 'Name' : 'Name', de ? 'Zeiten' : 'Hours'];
  return (
    <main className="wizard">
      <div className="wizard-top">
        <Brand />
        <Preferences />
      </div>
      <div className="wizard-steps" aria-label={de ? 'Fortschritt' : 'Progress'}>
        {steps.map((s, i) => (
          <div key={s} className={`wizard-step ${i < step ? 'done' : i === step ? 'on' : ''}`}>
            <span>{i < step ? <Check size={12} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <div className="wizard-card" key={step}>
        {step === 0 && (
          <>
            <h1>{de ? 'Was für ein Unternehmen hast du?' : 'What kind of business do you run?'}</h1>
            <p className="lead">{de ? 'Wir richten passende Leistungen und Texte für dich ein. Du kannst alles später ändern.' : 'We set up matching services and texts. You can change everything later.'}</p>
            <div className="industry-grid">
              {industries.map((i) => (
                <button
                  key={i.id}
                  className={`industry ${industry === i.id ? 'on' : ''}`}
                  onClick={() => {
                    setIndustry(i.id);
                    setTimeout(() => setStep(1), 180);
                  }}
                >
                  <span className="industry-emoji">{i.emoji}</span>
                  <span>{de ? i.de : i.en}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>{de ? 'Wie heißt dein Unternehmen?' : 'What is your business called?'}</h1>
            <p className="lead">{de ? 'So sehen es deine Kunden auf der Buchungsseite.' : 'Customers see this on your booking page.'}</p>
            <div className="stack">
              <div className="field">
                <label htmlFor="ob-name">{de ? 'Name des Unternehmens' : 'Business name'}</label>
                <input id="ob-name" className="big-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={chosen ? `${de ? 'z. B.' : 'e.g.'} ${de ? chosen.de : chosen.en} ${de ? 'Sonnenschein' : 'Sunshine'}` : ''} maxLength={100} />
                {slug.length >= 3 && (
                  <small className="muted">
                    {de ? 'Deine Buchungsseite:' : 'Your booking page:'} <b>slotdove…/b/{slug}</b>
                  </small>
                )}
              </div>
              <div className="field">
                <label htmlFor="ob-owner">{de ? 'Dein Vorname (für den Kalender)' : 'Your first name (for the calendar)'}</label>
                <input id="ob-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={de ? 'z. B. Lena' : 'e.g. Lena'} maxLength={100} />
              </div>
              <div className="field">
                <label>{de ? 'Sprache für Kunden' : 'Language for customers'}</label>
                <div className="row">
                  <button className={`chip ${language === 'de' ? 'on' : ''}`} onClick={() => setLanguage('de')}>
                    🇩🇪 Deutsch
                  </button>
                  <button className={`chip ${language === 'en' ? 'on' : ''}`} onClick={() => setLanguage('en')}>
                    🇬🇧 English
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>{de ? 'Wann hast du geöffnet?' : 'When are you open?'}</h1>
            <p className="lead">{de ? 'Ein Startpunkt – Pausen, Feiertage und Urlaub stellst du danach mit wenigen Klicks ein.' : 'A starting point – breaks, holidays and vacation come next with a few clicks.'}</p>
            <div className="choice-grid two">
              {(Object.keys(hourPresets) as HourPreset[]).map((k) => (
                <button key={k} className={`choice ${hours === k ? 'on' : ''}`} onClick={() => setHours(k)}>
                  <strong>{de ? hourPresets[k].de : hourPresets[k].en}</strong>
                  <span className="mini-week">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <i key={d} className={(hourPresets[k].days as readonly number[]).includes(d) ? 'on' : ''} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            {chosen && (
              <label className="template-box">
                <input type="checkbox" checked={template} onChange={(e) => setTemplate(e.target.checked)} />
                <span>
                  <strong>
                    <Sparkles size={14} /> {de ? 'Passende Leistungen vorschlagen' : 'Suggest matching services'}
                  </strong>
                  <small>{chosen.services.map((s) => (de ? s.de : s.en)).join(' · ')}</small>
                </span>
              </label>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={15} /> {de ? 'Zurück' : 'Back'}
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={(step === 0 && !industry) || (step === 1 && name.trim().length < 2)}>
              {de ? 'Weiter' : 'Next'} <ArrowRight size={15} />
            </Button>
          ) : (
            <Button onClick={finish} disabled={busy} size="lg">
              {busy ? <span className="spinner" /> : <Check size={16} />}
              {de ? 'Fertig – los geht’s!' : 'Done – let’s go!'}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
