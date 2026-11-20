import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal';
import { ReportForm } from '@/components/report-form';
export const metadata: Metadata = { title: 'Inhalte melden – Slotdove', description: 'Melden Sie rechtswidrige Inhalte oder Missbrauch nach Art. 16 Digital Services Act.' };
export default function Page() {
  return (
    <LegalPage title="Inhalte oder Missbrauch melden">
      <p>
        Sie haben auf einer Buchungsseite, in einer Leistungsbeschreibung, einem Bild oder einer Chatnachricht einen rechtswidrigen Inhalt entdeckt, wurden belästigt oder vermuten Betrug oder ein
        Sicherheitsproblem? Melden Sie es uns hier (Melde- und Abhilfeverfahren nach Art. 16 Digital Services Act). Wir prüfen jede Meldung zeitnah, sorgfältig und objektiv.
      </p>
      <p>
        Bitte geben Sie möglichst genau an, <strong>wo</strong> sich der Inhalt befindet (Link), <strong>was</strong> genau beanstandet wird und <strong>warum</strong> er Ihrer Ansicht nach rechtswidrig
        ist. Wenn Sie Name und E-Mail angeben, bestätigen wir den Eingang und teilen Ihnen unsere Entscheidung mit. Bei Meldungen zu Straftaten gegen die sexuelle Selbstbestimmung von Kindern ist die
        Angabe von Name und E-Mail freiwillig.
      </p>
      <p>Bei akuter Gefahr für Leib und Leben wenden Sie sich bitte sofort an die Polizei (110).</p>
      <ReportForm />
      <p className="meta">
        Missbräuchliche Meldungen können nach Art. 23 DSA zur Sperrung führen. Ihre Angaben verarbeiten wir nach unserer <Link href="/datenschutz#meldungen">Datenschutzerklärung</Link>.
      </p>
    </LegalPage>
  );
}
