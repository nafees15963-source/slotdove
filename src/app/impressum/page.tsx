import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage, Ph } from '@/components/legal';
export const metadata: Metadata = { title: 'Impressum – Slotdove', description: 'Anbieterkennzeichnung nach § 5 DDG, Kontaktstellen nach DSA und Hinweise zur Streitbeilegung.' };
export default function Page() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <p>
        <Ph>VOR- UND NACHNAME</Ph>
        <br />
        <Ph>FIRMENNAME / GESCHÄFTSBEZEICHNUNG, falls vorhanden – z. B. „Slotdove, Inhaber Vorname Nachname“</Ph>
        <br />
        <Ph>STRASSE UND HAUSNUMMER</Ph>
        <br />
        <Ph>PLZ ORT</Ph>
        <br />
        Deutschland
      </p>
      <p>Ein Postfach ist keine ladungsfähige Anschrift; hier muss eine zustellfähige Adresse stehen.</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Ph>E-MAIL-ADRESSE</Ph>
        <br />
        Telefon: <Ph>TELEFONNUMMER</Ph>
        <br />
        Wir beantworten Anfragen in der Regel innerhalb von 48 Stunden an Werktagen.
      </p>

      <h2>Umsatzsteuer</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: <Ph>USt-IdNr., falls vorhanden – sonst diesen Abschnitt löschen</Ph>
        <br />
        Wirtschafts-Identifikationsnummer gemäß § 139c AO: <Ph>W-IdNr., falls vorhanden</Ph>
      </p>
      <p>
        <Ph>Falls Kleinunternehmer: „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“</Ph>
      </p>

      <h2>Registereintrag</h2>
      <p>
        <Ph>Nur falls eingetragen (z. B. e. K., UG, GmbH): Registergericht, Registernummer, Vertretungsberechtigte(r) Geschäftsführer(in) – sonst diesen Abschnitt löschen</Ph>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <Ph>VOR- UND NACHNAME</Ph>, Anschrift wie oben.
      </p>

      <h2>Zentrale Kontaktstelle nach Art. 11 und 12 Digital Services Act (DSA)</h2>
      <p>
        Für Behörden der Mitgliedstaaten, die Europäische Kommission, das Europäische Gremium für digitale Dienste sowie für Nutzerinnen und Nutzer unseres Dienstes ist unsere zentrale Kontaktstelle
        elektronisch erreichbar unter: <Ph>E-MAIL-ADRESSE</Ph>. Eine Kommunikation ist auf Deutsch und Englisch möglich. Die Kontaktaufnahme erfolgt nicht ausschließlich über automatisierte Werkzeuge.
      </p>
      <p>
        Rechtswidrige Inhalte (z. B. auf Buchungsseiten, in Leistungsbeschreibungen, Bildern oder Chatnachrichten) können Sie jederzeit über unser <Link href="/melden">Meldeformular</Link> melden (Art. 16 DSA).
      </p>

      <h2>Verbraucherstreitbeilegung (§ 36 VSBG)</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Unser Angebot richtet sich ausschließlich an Unternehmer im Sinne
        des § 14 BGB.
      </p>
      <p>Hinweis: Die frühere EU-Plattform zur Online-Streitbeilegung (OS-Plattform) wurde zum 20. Juli 2025 eingestellt; ein Link darauf ist daher nicht mehr anzugeben.</p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für Inhalte, die Nutzer (insbesondere Betriebe auf ihren Buchungsseiten) einstellen,
        gelten die Haftungsregeln für Hosting-Diensteanbieter nach Art. 6 DSA: Wir haften nicht, solange wir keine tatsächliche Kenntnis von rechtswidrigen Inhalten haben und nach Kenntniserlangung zügig
        tätig werden, um diese zu entfernen oder den Zugang zu sperren. Eine allgemeine Pflicht zur Überwachung übermittelter oder gespeicherter Informationen besteht nicht (Art. 8 DSA).
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Zum
        Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch uns erstellten Inhalte, Texte, Grafiken, das Logo und der Programmcode unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
        außerhalb der Grenzen des Urheberrechts bedürfen unserer schriftlichen Zustimmung. Inhalte, die Betriebe selbst hochladen (z. B. Logos und Leistungsbilder), verbleiben bei den jeweiligen
        Rechteinhabern.
      </p>

      <h2>Barrierefreiheit</h2>
      <p>
        Wir bemühen uns, Slotdove möglichst barrierearm zu gestalten (Tastaturbedienung, Kontraste, Screenreader-Beschriftungen). Hinweise auf Barrieren nehmen wir gern unter <Ph>E-MAIL-ADRESSE</Ph>{' '}
        entgegen.
      </p>
    </LegalPage>
  );
}
