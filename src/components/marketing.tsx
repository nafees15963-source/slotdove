import { getPlanPricing } from '@/lib/pricing';
import type { PlanId } from '@/lib/billing';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Users,
  Scissors,
  SlidersHorizontal,
  Globe2,
  CalendarCheck2,
} from 'lucide-react';
import { Brand } from './brand';
import { Preferences } from './preferences';
import { Button } from './ui/button';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { marketing } from '@/lib/i18n/marketing';
export async function MarketingNav() {
  const t = await getMessages();
  return (
    <div className="market-container">
      <nav className="market-nav">
        <Brand />
        <details className="mobile-site-menu">
          <summary aria-label="Navigation">☰</summary>
          <div>
            <Link href="/#product">{t.product}</Link>
            <Link href="/#features">{t.features}</Link>
            <Link href="/#solutions">{t.solutions}</Link>
            <Link href="/#pricing">{t.pricing}</Link>
            <Link href="/login">{t.login}</Link>
          </div>
        </details>
        <div className="market-links">
          <Link href="/#product">{t.product}</Link>
          <Link href="/#features">{t.features}</Link>
          <Link href="/#solutions">{t.solutions}</Link>
          <Link href="/#pricing">{t.pricing}</Link>
        </div>
        <div className="market-nav-actions">
          <Preferences />
          <Button variant="ghost" asChild>
            <Link href="/login">{t.login}</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              {t.start}
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}
export async function MarketingFooter() {
  const locale = await getLocale(),
    t = await getMessages(),
    m = marketing[locale];
  return (
    <footer className="market-footer">
      <div className="market-container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>{m.footer}</p>
          </div>
          <div className="footer-links">
            <div>
              <strong>{m.productLinks}</strong>
              <Link href="/#features">{t.features}</Link>
              <Link href="/#pricing">{t.pricing}</Link>
              <Link href="/signup">{t.start}</Link>
            </div>
            <div>
              <strong>{m.companyLinks}</strong>
              <Link href="/about">{t.about}</Link>
              <Link href="/contact">{t.contact}</Link>
              <Link href="/admin/login">
                {locale === 'de' ? 'Plattformverwaltung' : 'Platform administration'}
              </Link>
              <Link href="/#faq">{t.faq}</Link>
            </div>
            <div>
              <strong>{m.legalLinks}</strong>
              <Link href="/privacy">{t.privacy}</Link>
              <Link href="/terms">{t.terms}</Link>
              <Link href="/legal">{t.legal}</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{m.rights}</span>
          <Preferences />
        </div>
      </div>
    </footer>
  );
}
export async function Landing() {
  const prices = await getPlanPricing();
  const locale = await getLocale(),
    t = await getMessages(),
    m = marketing[locale];
  return (
    <>
      <MarketingNav />
      <main>
        <section className="hero" id="product">
          <div className="market-container">
            <div className="hero-label">
              <span className="dot purple" />
              {m.label}
              <ArrowUpRight size={11} />
            </div>
            <h1>
              {m.heroA}
              <br />
              <em>{m.heroB}</em>
            </h1>
            <p>{m.sub}</p>
            <div className="hero-actions">
              <Button size="lg" asChild>
                <Link href="/signup">
                  {t.start}
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how">
                  <MousePointer2 size={14} />
                  {m.see}
                </Link>
              </Button>
            </div>
            <div className="hero-note">
              <span>
                <Check size={12} />
                {m.noCard}
              </span>
              <span>
                <Check size={12} />
                {m.ownPace}
              </span>
            </div>
            <div className="product-preview" aria-label={t.previewLabel}>
              <div className="preview-sidebar">
                <Brand />
                <div className="preview-nav active">
                  <LayoutDashboard size={13} />
                  {t.overview}
                </div>
                {[
                  [CalendarDays, t.calendar],
                  [Users, t.customers],
                  [Scissors, t.services],
                  [Clock3, t.availability],
                  [SlidersHorizontal, t.settings],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof CalendarDays;
                  return (
                    <div key={String(label)} className="preview-nav">
                      <I size={13} />
                      {String(label)}
                    </div>
                  );
                })}
              </div>
              <div className="preview-main">
                <div className="preview-top">
                  <span>
                    {m.previewCompany} / {t.overview}
                  </span>
                  <span>{m.previewDate}</span>
                </div>
                <div className="spread">
                  <div>
                    <h3>{m.previewGreeting}</h3>
                    <p>{m.previewSub}</p>
                  </div>
                  <span className="avatar">Y</span>
                </div>
                <div className="preview-metrics">
                  {m.previewMetric.map((v, i) => (
                    <div className="preview-metric" key={v}>
                      {v}
                      <strong>{[8, 6, 24][i]}</strong>
                    </div>
                  ))}
                </div>
                <div className="preview-table">
                  <div className="panel-head" style={{ padding: '13px 16px' }}>
                    <strong style={{ fontSize: 11 }}>{m.previewHeading}</strong>
                    <span className="badge badge-purple">{t.previewLabel}</span>
                  </div>
                  <table>
                    <tbody>
                      {m.previewNames.map((name, i) => (
                        <tr key={name}>
                          <td>
                            <div className="row">
                              <span
                                className="avatar"
                                style={{
                                  background: ['#f0eafa', '#e7f1f2', '#f9eee4'][i],
                                  color: '#76638e',
                                }}
                              >
                                {name.split(' ')[1][0]}
                              </span>
                              <span>
                                {name}
                                <br />
                                <small style={{ fontSize: 9 }}>{m.previewService}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            {['09:00', '10:30', '14:00'][i]}
                            <br />
                            <small style={{ fontSize: 9 }}>30 {t.minutes}</small>
                          </td>
                          <td>
                            <span className="badge badge-green">
                              <span className="dot" />
                              {m.previewStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="preview-caption">
              {t.previewLabel} · {t.sample}
            </div>
            <div className="benefit-strip">
              {[CalendarCheck2, Users, ShieldCheck].map((Icon, i) => (
                <div className="benefit-item" key={i}>
                  <Icon size={18} />
                  <span>{m.strip[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="features" className="marketing-section market-container">
          <div className="section-intro">
            <div className="eyebrow">{m.featureLabel}</div>
            <h2>{m.featureTitle}</h2>
            <p>{m.featureText}</p>
          </div>
          <div className="feature-layout">
            <div className="feature-large">
              <Globe2 size={22} className="purple" />
              <h3>{m.featureNames[0]}</h3>
              <p>{m.featureDescriptions[0]}</p>
              <div className="booking-mini">
                <div className="row" style={{ marginBottom: 16 }}>
                  <span className="avatar">Y</span>
                  <div>
                    <h4>{m.previewCompany}</h4>
                    <small>
                      {m.previewService} · 30 {t.minutes}
                    </small>
                  </div>
                </div>
                <div className="spread">
                  <small>{m.month}</small>
                  <ChevronRight size={13} />
                </div>
                <div className="mini-days">
                  {Array.from({ length: 28 }, (_, i) => (
                    <span key={i} className={`mini-day ${i === 9 ? 'selected' : ''}`}>
                      {i + 1}
                    </span>
                  ))}
                </div>
                <div className="mini-times">
                  {['09:00', '10:30', '14:00'].map((time) => (
                    <span className="mini-time" key={time}>
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="stack">
              <div className="feature-small">
                <div className="feature-icon">
                  <CalendarDays size={20} />
                </div>
                <h3>{m.featureNames[1]}</h3>
                <p>{m.featureDescriptions[1]}</p>
                <div className="row" style={{ marginTop: 24 }}>
                  <span className="badge badge-green">
                    <Check size={12} />
                    {t.confirmed}
                  </span>
                  <span className="badge">
                    15 {t.minutes} {t.after.toLowerCase().split(' (')[0]}
                  </span>
                </div>
              </div>
              <div className="feature-small">
                <div className="feature-icon">
                  <Users size={20} />
                </div>
                <h3>{m.featureNames[2]}</h3>
                <p>{m.featureDescriptions[2]}</p>
                <div className="row" style={{ marginTop: 24, gap: 6 }}>
                  {['A', 'S', 'J'].map((v, i) => (
                    <span
                      className="avatar"
                      key={v}
                      style={{ background: ['#ece7f8', '#e7efed', '#f4ece5'][i], color: '#796a89' }}
                    >
                      {v}
                    </span>
                  ))}
                  <span className="badge" style={{ marginLeft: 10 }}>
                    {t.staff} <Check size={11} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="marketing-section how-section" id="how">
          <div className="market-container">
            <div className="section-intro center">
              <div className="eyebrow">{m.howLabel}</div>
              <h2>{m.howTitle}</h2>
            </div>
            <div className="grid-3">
              {m.steps.map(([title, description], i) => (
                <div className="how-step" key={title}>
                  <div className="how-number">0{i + 1} /</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section market-container" id="solutions">
          <div className="section-intro center">
            <div className="eyebrow">{m.industryLabel}</div>
            <h2>{m.industryTitle}</h2>
          </div>
          <div className="industry-list">
            {m.industries.map((v, i) => (
              <Link
                className="industry-pill"
                href={`/solutions/${['beauty', 'consultants', 'coaches', 'fitness', 'tutors', 'freelancers'][i]}`}
                key={v}
              >
                {v} <ArrowUpRight size={13} style={{ display: 'inline', marginLeft: 10 }} />
              </Link>
            ))}
          </div>
        </section>
        <section
          className="marketing-section market-container"
          id="pricing"
          style={{ paddingTop: 15 }}
        >
          <div className="section-intro center">
            <div className="eyebrow">{m.pricingLabel}</div>
            <h2>{m.pricingTitle}</h2>
            <p>{m.pricingSub}</p>
          </div>
          <div className="grid-3">
            {m.plans.map(([name, desc, , features], i) => (
              <div className={`panel pricing-card ${i === 1 ? 'featured' : ''}`} key={String(name)}>
                <div className="spread">
                  <h3>{i === 0 ? 'Starter' : String(name)}</h3>
                  {i === 1 && (
                    <span className="badge badge-purple">
                      {locale === 'de' ? 'Für dein Team' : 'For your team'}
                    </span>
                  )}
                </div>
                <div className="price">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: prices[(['free', 'pro', 'business'] as PlanId[])[i]].currency,
                    maximumFractionDigits: 0,
                  }).format(
                    prices[(['free', 'pro', 'business'] as PlanId[])[i]].monthlyPriceCents / 100,
                  )}
                  <small> / {locale === 'de' ? 'Monat' : 'month'}</small>
                </div>
                <p>{String(desc)}</p>
                <ul className="pricing-features">
                  {(features as string[]).map((f) => (
                    <li key={f}>
                      <Check size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={i === 1 ? 'default' : 'outline'} asChild>
                  <Link href="/signup">
                    {m.access}
                    <ArrowRight size={13} />
                  </Link>
                </Button>
                {<p style={{ fontSize: 9, marginTop: 12, textAlign: 'center' }}>{m.soon}</p>}
              </div>
            ))}
          </div>
        </section>
        <section id="faq" className="marketing-section market-container" style={{ paddingTop: 15 }}>
          <div className="section-intro center">
            <div className="eyebrow">FAQ</div>
            <h2>{m.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {m.faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="market-container">
          <section className="final-cta">
            <Sparkles size={24} className="purple" style={{ margin: '0 auto 22px' }} />
            <h2>{m.cta}</h2>
            <p>{m.ctaSub}</p>
            <Button size="lg" asChild>
              <Link href="/signup">
                {t.start}
                <ArrowRight size={15} />
              </Link>
            </Button>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
