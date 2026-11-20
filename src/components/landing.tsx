import Link from 'next/link';
import { ArrowRight, Check, Sparkles, X, ShieldCheck, Zap, Heart } from 'lucide-react';
import { MarketingNav, MarketingFooter } from './marketing';
import { TutorialVisual } from './tutorial';
import { WaitlistForm } from './waitlist-form';
import { getLocale } from '@/lib/i18n/server';
import { industries } from '@/lib/industries';
import { PLAN_DEFAULTS } from '@/lib/billing';
import { dateDe, publicSettings } from '@/lib/release';
import { SupportCard } from './support-card';

export async function Landing() {
  const locale = await getLocale();
  const de = locale === 'de';
  const { release, support } = await publicSettings();
  const from = dateDe(release.free_from),
    until = dateDe(release.free_until),
    after = String(Number(release.free_until.slice(0, 4)) + 1);
  const features = [
    { visual: 'quick-add', title: de ? 'Termin in einem Satz' : 'Book in one sentence', text: de ? '„Morgen 14 Uhr Haarschnitt Anna“ – die eingebaute KI füllt alles aus. Läuft lokal, ohne Cloud-KI.' : '“Tomorrow 2pm haircut Anna” – the built-in AI fills everything in. Runs locally.', big: true },
    { visual: 'week-plan', title: de ? 'Wochenplan in 10 Sekunden' : 'Week plan in 10 seconds', text: de ? 'Tage anklicken, Pause einfügen, auf alle Werktage kopieren.' : 'Toggle days, add a break, copy to all weekdays.' },
    { visual: 'share-link', title: de ? 'Eigene Buchungsseite' : 'Your booking page', text: de ? 'Kunden buchen rund um die Uhr – per Link, Instagram oder Website.' : 'Customers book 24/7 via link, Instagram or website.' },
    { visual: 'chat', title: de ? 'Chat mit Kunden & Team' : 'Chat with customers & team', text: de ? 'Rückfragen direkt am Termin. Mit automatischem Schutz vor Spam und Beleidigungen.' : 'Questions right at the appointment, with spam protection.' },
    { visual: 'holiday', title: de ? 'Feiertage automatisch' : 'Holidays automatically', text: de ? 'Alle Feiertage deines Bundeslandes mit einem Klick blockiert.' : 'All public holidays of your state blocked in one click.' },
    { visual: 'stats', title: de ? 'Zahlen, die du verstehst' : 'Numbers you understand', text: de ? 'Umsatz, Auslastung, No-Shows – mit Tipps in normaler Sprache.' : 'Revenue, utilisation, no-shows – with plain-language tips.' },
  ] as const;
  const plans = [
    { id: 'free' as const, items: de ? ['1 Kalender', 'Online-Buchungsseite', 'Erinnerungen per E-Mail', 'Kunden-Chat'] : ['1 calendar', 'Booking page', 'Email reminders', 'Customer chat'] },
    { id: 'pro' as const, items: de ? ['Bis 5 Teammitglieder', 'Slotdove KI', 'Auswertungen & Tipps', 'Alles aus Starter'] : ['Up to 5 team members', 'Slotdove AI', 'Analytics & tips', 'Everything in Starter'], hot: true },
    { id: 'business' as const, items: de ? ['Bis 50 Teammitglieder', 'Mehrere Standorte', 'Bevorzugter Support', 'Alles aus Pro'] : ['Up to 50 team members', 'Multiple locations', 'Priority support', 'Everything in Pro'] },
  ];
  const faq = de
    ? [
        ['Brauche ich technische Kenntnisse?', 'Nein. Du wählst deine Branche, gibst einen Namen ein und klickst deine Öffnungszeiten an. Jede Seite hat ein eigenes kurzes Tutorial.'],
        ['Muss ich Mitarbeiter anlegen?', 'Nein. Du kannst sofort Termine eintragen und Mitarbeiter später zuordnen – oder ganz alleine arbeiten.'],
        ['Wie funktioniert die KI ohne Cloud?', 'Die Slotdove KI läuft direkt in deinem Browser. Sie versteht Termine in normaler Sprache, beantwortet Fragen zu deinem Kalender und gibt Tipps – deine Daten gehen an keinen KI-Anbieter.'],
        ['Was kostet Slotdove?', `Vom ${from} bis ${until} nichts – alle Funktionen sind kostenlos. Es gibt kein Abo, du gibst keine Zahlungsdaten an und nichts verlängert sich automatisch.`],
        ['Was passiert nach der Gratis-Phase?', `Ab ${after} gelten voraussichtlich die Tarife unten (ab 5 € im Monat). Wir informieren dich rechtzeitig vorher. Du entscheidest dann selbst, ob du weitermachst – ohne Zustimmung entstehen keine Kosten.`],
        ['Zahle ich Provision pro Buchung?', 'Nein. Keine Provision, keine versteckten Kosten.'],
        ['Wie bekomme ich Zugang?', 'Melde dich unten kostenlos vor. Wir prüfen jede Anmeldung persönlich und schicken dir dann einen persönlichen Registrierungslink.'],
        ['Ist das DSGVO-konform?', 'Daten liegen in einer EU-Datenbank (Frankfurt). Kunden können ihre Daten exportieren oder anonymisieren lassen.'],
        ['Muss ich kündigen?', 'Nein. In der Gratis-Phase gibt es nichts zu kündigen. Du kannst dein Konto jederzeit selbst löschen.'],
      ]
    : [
        ['Do I need technical skills?', 'No. Pick your industry, enter a name and click your opening hours. Every page has its own short tutorial.'],
        ['Do I have to add staff?', 'No. Add appointments right away and assign staff later – or work alone.'],
        ['How does the AI work without the cloud?', 'Slotdove AI runs in your browser. It understands appointments in plain language and answers questions – your data never goes to an AI vendor.'],
        ['What does Slotdove cost?', `Nothing from ${from} to ${until} – every feature is free. No subscription, no payment details, nothing renews automatically.`],
        ['What happens after the free phase?', `From ${after} the plans below will most likely apply (from €5/month). We will tell you in advance; nothing is charged without your consent.`],
        ['Do I pay commission per booking?', 'No commission, no hidden fees.'],
        ['How do I get access?', 'Pre-register below. We review every request personally and send you a personal sign-up link.'],
        ['Is it GDPR compliant?', 'Data is stored in an EU database (Frankfurt). Customers can export or anonymise their data.'],
        ['Do I need to cancel?', 'No. There is nothing to cancel during the free phase. You can delete your account at any time.'],
      ];
  const row = industries.filter((i) => i.id !== 'other');
  return (
    <>
      <MarketingNav />
      <main className="landing">
        <section className="l-hero l-hero-dark">
          <div className="l-glow" aria-hidden />
          <div className="market-container l-hero-grid">
            <div className="l-hero-copy">
              <span className="l-pill">
                <Sparkles size={14} /> {de ? `Ab ${from} komplett kostenlos · Voranmeldung offen` : `Completely free from ${from} · pre-registration open`}
              </span>
              <h1>
                {de ? 'Termine planen.' : 'Scheduling,'}
                <br />
                <span className="l-grad">{de ? 'So einfach wie eine Nachricht.' : 'as easy as a text message.'}</span>
              </h1>
              <p>
                {de
                  ? `Online-Buchung, Kalender, Kunden-Chat und Erinnerungen für kleine Unternehmen. Vom ${from} bis ${until} kostenlos – kein Abo, keine Zahlungsdaten.`
                  : `Online booking, calendar, customer chat and reminders for small businesses. Free from ${from} to ${until} – no subscription, no payment details.`}
              </p>
              <div className="l-cta">
                <Link className="btn btn-light btn-lg" href="#warteliste">
                  {de ? 'Kostenlos voranmelden' : 'Pre-register for free'} <ArrowRight size={16} />
                </Link>
                <Link className="btn btn-glass btn-lg" href="#features">
                  {de ? 'Funktionen ansehen' : 'See features'}
                </Link>
              </div>
              <div className="l-trust">
                <span>
                  <Check size={14} /> {de ? `Bis ${until} gratis` : `Free until ${until}`}
                </span>
                <span>
                  <Check size={14} /> {de ? 'Kein Abo, keine Zahlungsdaten' : 'No subscription, no payment details'}
                </span>
                <span>
                  <Check size={14} /> {de ? 'Server in der EU' : 'EU servers'}
                </span>
              </div>
            </div>
            <div className="l-mock" aria-label={de ? 'Beispielansicht' : 'Sample view'}>
              <div className="l-mock-card main">
                <div className="l-mock-head">
                  <span className="dotrow">
                    <i />
                    <i />
                    <i />
                  </span>
                  <small>{de ? 'Heute · Salon Aurora' : 'Today · Salon Aurora'}</small>
                </div>
                <div className="l-mock-greet">{de ? 'Guten Morgen! 👋' : 'Good morning! 👋'}</div>
                <div className="l-mock-input">
                  <Sparkles size={14} />
                  <span className="viz-typing">{de ? 'Morgen 14 Uhr Färben Anna' : 'Tomorrow 2pm colour Anna'}</span>
                </div>
                {[
                  ['09:00', 'Lena K.', de ? 'Haarschnitt' : 'Haircut', '#0d7f79'],
                  ['10:30', 'Jonas W.', de ? 'Bart trimmen' : 'Beard trim', '#14b8a6'],
                  ['14:00', 'Anna M.', de ? 'Färben' : 'Colour', '#5fd6c6'],
                ].map(([t, n, s, c], i) => (
                  <div className="l-mock-row" key={t} style={{ animationDelay: `${0.6 + i * 0.25}s`, borderLeftColor: c }}>
                    <b>{t}</b>
                    <span>
                      {n}
                      <small>{s}</small>
                    </span>
                    <em>✓</em>
                  </div>
                ))}
              </div>
              <div className="l-mock-card phone">
                <div className="viz-phone-head" />
                <strong>{de ? 'Zeit wählen' : 'Pick a time'}</strong>
                <div className="l-slots">
                  {['09:00', '09:30', '10:00', '11:30', '14:00', '15:30'].map((s, i) => (
                    <span key={s} className={i === 4 ? 'on' : ''}>
                      {s}
                    </span>
                  ))}
                </div>
                <span className="l-book">{de ? 'Jetzt buchen' : 'Book now'}</span>
              </div>
              <div className="l-mock-card toast">
                🔔 {de ? 'Neue Buchung: Anna, morgen 14:00' : 'New booking: Anna, tomorrow 2pm'}
              </div>
            </div>
          </div>
        </section>
        <section className="l-marquee" aria-label={de ? 'Branchen' : 'Industries'}>
          <div className="l-marquee-track">
            {[...row, ...row].map((i, n) => (
              <span key={n}>
                {i.emoji} {de ? i.de : i.en}
              </span>
            ))}
          </div>
        </section>
        <section className="market-container l-section" id="features">
          <div className="l-intro">
            <span className="eyebrow">{de ? 'Funktionen' : 'Features'}</span>
            <h2>{de ? 'Alles, was du brauchst. Nichts, was dich bremst.' : 'Everything you need. Nothing that slows you down.'}</h2>
          </div>
          <div className="l-bento">
            {features.map((f) => (
              <article key={f.title} className={`l-feature ${'big' in f && f.big ? 'big' : ''}`}>
                <TutorialVisual kind={f.visual} compact />
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="market-container l-section" id="how">
          <div className="l-intro">
            <span className="eyebrow">{de ? 'So geht’s' : 'How it works'}</span>
            <h2>{de ? 'In drei Schritten startklar' : 'Ready in three steps'}</h2>
          </div>
          <div className="l-steps">
            {(de
              ? [
                  ['Branche wählen', 'Friseur, Physio, Fahrschule … Passende Leistungen werden vorgeschlagen.'],
                  ['Zeiten anklicken', 'Öffnungszeiten, Pausen und Feiertage – mit ein paar Klicks.'],
                  ['Link teilen', 'Kunden buchen selbst. Du bekommst Bescheid und behältst alles im Blick.'],
                ]
              : [
                  ['Pick your industry', 'Hair salon, physio, driving school … matching services are suggested.'],
                  ['Click your hours', 'Opening hours, breaks and holidays – in a few clicks.'],
                  ['Share your link', 'Customers book themselves. You get notified and keep the overview.'],
                ]
            ).map(([title, text], i) => (
              <div className="l-step" key={title}>
                <span>{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="market-container l-section" id="solutions">
          <div className="l-compare">
            <div>
              <span className="eyebrow">{de ? 'Warum Slotdove?' : 'Why Slotdove?'}</span>
              <h2>{de ? 'Gemacht für kleine Teams – nicht für IT-Abteilungen.' : 'Made for small teams – not IT departments.'}</h2>
              <p className="muted">{de ? 'Viele Buchungstools sind überladen, englischsprachig oder kassieren pro Termin mit. Slotdove ist anders.' : 'Many booking tools are bloated or take a cut per booking. Slotdove is different.'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>{de ? 'Typische Tools' : 'Typical tools'}</th>
                  <th className="hl">Slotdove</th>
                </tr>
              </thead>
              <tbody>
                {(de
                  ? [
                      ['Provision pro Buchung', false, true, 'Keine'],
                      ['Einrichtung', false, true, '2 Minuten'],
                      ['Termine ohne Mitarbeiter-Zuordnung', false, true],
                      ['Tutorial auf jeder Seite', false, true],
                      ['KI ohne Cloud-Anbieter', false, true],
                      ['Deutsche Feiertage automatisch', false, true],
                    ]
                  : [
                      ['Commission per booking', false, true, 'None'],
                      ['Setup', false, true, '2 minutes'],
                      ['Appointments without staff', false, true],
                      ['Tutorial on every page', false, true],
                      ['AI without cloud vendor', false, true],
                      ['Public holidays automatically', false, true],
                    ]
                ).map(([label, a, b, note]) => (
                  <tr key={String(label)}>
                    <td>{label}</td>
                    <td>{a ? <Check size={16} /> : <X size={16} className="muted" />}</td>
                    <td className="hl">{note ? <strong>{note}</strong> : b ? <Check size={16} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="market-container l-section" id="pricing">
          <div className="l-intro">
            <span className="eyebrow">{de ? 'Preise' : 'Pricing'}</span>
            <h2>{de ? `${release.free_from.slice(0, 4)}: alles kostenlos.` : `${release.free_from.slice(0, 4)}: everything free.`}</h2>
            <p>
              {de
                ? `Vom ${from} bis ${until} nutzt du alle Funktionen für 0 € – ohne Abo, ohne Zahlungsdaten, ohne automatische Verlängerung. Danach gelten voraussichtlich diese Tarife. Wir sagen dir rechtzeitig Bescheid, und du entscheidest selbst.`
                : `From ${from} to ${until} every feature is €0 – no subscription, no payment details, no auto-renewal. Afterwards these plans will most likely apply. We will tell you in advance and you decide.`}
            </p>
          </div>
          <div className="free-banner">
            <strong>0 €</strong>
            <span>
              {de ? `alle Funktionen · ${from} – ${until}` : `all features · ${from} – ${until}`}
              <small>{de ? 'Kein Abo · nichts zu kündigen · keine Kreditkarte' : 'No subscription · nothing to cancel · no card'}</small>
            </span>
          </div>
          <div className="plan-grid">
            {plans.map((p) => (
              <div key={p.id} className={`plan-card ${p.hot ? 'featured' : ''}`}>
                <span className="badge">{de ? `voraussichtlich ab ${after}` : `expected from ${after}`}</span>
                <h3>{PLAN_DEFAULTS[p.id].name}</h3>
                <div className="plan-price">
                  <strong>{PLAN_DEFAULTS[p.id].monthlyPriceCents / 100} €</strong>
                  <span>/{de ? 'Monat' : 'month'}</span>
                </div>
                <ul>
                  {p.items.map((i) => (
                    <li key={i}>
                      <Check size={14} /> {i}
                    </li>
                  ))}
                </ul>
                <Link className={`btn ${p.hot ? 'btn-primary' : 'btn-outline'}`} href={`/?plan=${p.id}#warteliste`}>
                  {de ? `${release.free_from.slice(0, 4)} kostenlos nutzen` : `Use free in ${release.free_from.slice(0, 4)}`}
                </Link>
              </div>
            ))}
          </div>
        </section>
        {support.enabled && (
          <section className="market-container l-section narrow" id="unterstuetzen">
            <SupportCard support={support} de={de} />
          </section>
        )}
        <section className="l-section" id="warteliste">
          <div className="market-container wl-wrap">
            <div className="wl-intro">
              <span className="eyebrow">{de ? 'Voranmeldung' : 'Pre-registration'}</span>
              <h2>{de ? 'Jetzt kostenlos voranmelden.' : 'Pre-register for free.'}</h2>
              <p>
                {de
                  ? `Slotdove startet am ${from} – und ist bis ${until} komplett kostenlos. Melden Sie sich vor: Wir prüfen jede Anmeldung persönlich und schicken Ihnen nach der Bestätigung einen persönlichen Registrierungslink.`
                  : `Slotdove launches on ${from} and is completely free until ${until}. Pre-register: we review every request personally and send you a personal sign-up link once approved.`}
              </p>
              <ul className="wl-points">
                <li>
                  <Check size={16} /> {de ? 'Kostenlos und unverbindlich' : 'Free and without obligation'}
                </li>
                <li>
                  <Check size={16} /> {de ? 'Persönliche Einrichtung' : 'Personal setup'}
                </li>
                <li>
                  <Check size={16} /> {de ? 'Ihre Wünsche fließen in die Entwicklung ein' : 'Your wishes shape the product'}
                </li>
                <li>
                  <Check size={16} /> {de ? 'Kein Abo, keine Kreditkarte, keine automatische Verlängerung' : 'No subscription, no card, no auto-renewal'}
                </li>
              </ul>
            </div>
            <div className="wl-card">
              <WaitlistForm />
            </div>
          </div>
        </section>
        <section className="market-container l-section narrow" id="faq">
          <div className="l-intro">
            <span className="eyebrow">FAQ</span>
            <h2>{de ? 'Häufige Fragen' : 'Frequently asked questions'}</h2>
          </div>
          <div className="l-faq">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="market-container l-section">
          <div className="l-final">
            <div className="l-final-icons" aria-hidden>
              <Zap size={20} />
              <Heart size={20} />
              <ShieldCheck size={20} />
            </div>
            <h2>{de ? 'Bereit für weniger Telefon und mehr Zeit?' : 'Ready for fewer calls and more time?'}</h2>
            <p>{de ? 'Leg jetzt los – in 2 Minuten ist deine Buchungsseite online.' : 'Start now – your booking page is online in 2 minutes.'}</p>
            <Link className="btn btn-light btn-lg" href="#warteliste">
              {de ? 'Kostenlos voranmelden' : 'Pre-register for free'} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
