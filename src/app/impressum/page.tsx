import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal';
import { OPERATOR, PROJECT_NOTE } from '@/lib/operator';
export const metadata: Metadata = { title: 'Impressum – Slotdove', description: 'Anbieterkennzeichnung nach § 5 DDG und § 18 MStV.' };
export default function Page() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        {OPERATOR.country}
      </p>
      <p>{PROJECT_NOTE}</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
        <br />
        Telefon: <a href={`tel:${OPERATOR.phoneIntl}`}>{OPERATOR.phone}</a>
      </p>

      <h2>Hinweis zum Projekt</h2>
      <p>
        Slotdove wird als privates Testprojekt betrieben, um herauszufinden, ob Interesse an einer einfachen Online-Terminbuchung besteht. Die Nutzung ist während der Testphase vollständig
        kostenlos. Es werden keine Entgelte verlangt, keine Abonnements abgeschlossen und keine Zahlungsdaten erhoben. Freiwillige Unterstützungen ohne Gegenleistung werden ausschließlich zur Deckung
        der laufenden Kosten verwendet. Eine Umsatzsteuer-Identifikationsnummer und ein Registereintrag bestehen nicht.
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}
      </p>

      <h2>Kontaktstelle nach Art. 11 und 12 Digital Services Act (DSA)</h2>
      <p>
        Für Behörden der Mitgliedstaaten, die Europäische Kommission, das Europäische Gremium für digitale Dienste sowie für Nutzerinnen und Nutzer ist die Kontaktstelle elektronisch erreichbar unter{' '}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. Kommunikation ist auf Deutsch und Englisch möglich und erfolgt nicht ausschließlich automatisiert.
      </p>
      <p>
        Rechtswidrige Inhalte (z. B. auf Buchungsseiten, in Leistungsbeschreibungen, Bildern oder Chatnachrichten) können jederzeit über das <Link href="/melden">Meldeformular</Link> gemeldet werden (Art.
        16 DSA).
      </p>

      <h2>Verbraucherstreitbeilegung (§ 36 VSBG)</h2>
      <p>Der Betreiber ist nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Für eigene Inhalte auf diesen Seiten ist der Betreiber nach den allgemeinen Gesetzen verantwortlich. Für Inhalte, die Nutzer (insbesondere Betriebe auf ihren Buchungsseiten) einstellen, gelten
        die Regeln für Hosting-Diensteanbieter nach Art. 6 DSA: Eine Haftung besteht erst ab Kenntnis eines rechtswidrigen Inhalts, wenn dieser dann nicht zügig entfernt oder gesperrt wird. Eine
        allgemeine Überwachungspflicht besteht nicht (Art. 8 DSA). Für Termine, Leistungen und Absprachen zwischen Betrieben und ihren Kunden ist ausschließlich der jeweilige Betrieb verantwortlich.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Für Inhalte externer Websites, auf die verlinkt wird, ist stets der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Bei Bekanntwerden von
        Rechtsverletzungen werden derartige Links umgehend entfernt.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die eigenen Inhalte, Texte, Grafiken, das Logo und der Programmcode unterliegen dem deutschen Urheberrecht. Inhalte, die Betriebe selbst hochladen (z. B. Logos und Bilder), verbleiben bei den
        jeweiligen Rechteinhabern.
      </p>

      <h2>Barrierefreiheit</h2>
      <p>
        Slotdove soll möglichst barrierearm nutzbar sein (Tastaturbedienung, Kontraste, Screenreader-Beschriftungen). Hinweise auf Barrieren gern an{' '}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
      </p>
    </LegalPage>
  );
}
