import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal';
import { dateDe, publicSettings } from '@/lib/release';
import { OPERATOR } from '@/lib/operator';
export const metadata: Metadata = {
  title: 'Nutzungsbedingungen – Slotdove',
  description: 'Nutzungsbedingungen für das kostenlose, private Testprojekt Slotdove (Online-Terminbuchung).',
};

const toc: [string, string][] = [
  ['projekt', 'Betreiber und Art des Projekts'],
  ['geltung', 'Geltungsbereich und Nutzerkreis'],
  ['zugang', 'Zugang, Freigabe und Unterschrift'],
  ['kostenlos', 'Kostenlose Nutzung, keine Entgelte'],
  ['leistung', 'Leistungsumfang „wie besehen“'],
  ['termine', 'Termine, Ausfälle und eigene Vorsorge'],
  ['pflichten', 'Pflichten der Nutzer'],
  ['inhalte', 'Inhalte und Nutzungsrechte'],
  ['verboten', 'Verbotene Nutzung'],
  ['moderation', 'Meldeverfahren, Moderation und Sperrung (DSA)'],
  ['ki', 'KI-Funktionen'],
  ['datenschutz', 'Datenschutz und Auftragsverarbeitung'],
  ['sicherheit', 'Zugangsdaten und Sicherheit'],
  ['haftung', 'Haftung'],
  ['freistellung', 'Freistellung'],
  ['ende', 'Laufzeit, Beendigung und Ende der Testphase'],
  ['aenderung', 'Änderungen dieser Bedingungen'],
  ['schluss', 'Schlussbestimmungen'],
];

export default async function Page() {
  const { release } = await publicSettings();
  const from = dateDe(release.free_from),
    until = dateDe(release.free_until);
  return (
    <LegalPage title="Nutzungsbedingungen" toc={toc}>
      <p className="notice">
        <strong>Kurz gesagt:</strong> Slotdove ist ein privates, kostenloses Testprojekt. Es wird kein Geld verlangt. Die Nutzung erfolgt ohne Gewähr. Für ausgefallene, falsche oder doppelte Termine,
        nicht zugestellte E-Mails, Ausfälle und Datenverluste wird – soweit gesetzlich zulässig – nicht gehaftet. Bitte führe wichtige Termine zusätzlich selbst und exportiere regelmäßig deine Daten.
        Verbindlich ist der vollständige Text unten.
      </p>

      <h2 id="projekt">§ 1 Betreiber und Art des Projekts</h2>
      <ol>
        <li>
          „Slotdove“ ist der Projektname eines <strong>privaten, nicht-kommerziellen Testprojekts</strong> von {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city} (nachfolgend „Betreiber“). Es
          besteht kein Gewerbe, kein Unternehmen und keine Gewinnerzielungsabsicht.
        </li>
        <li>
          Zweck des Projekts ist es, während einer Testphase von voraussichtlich einem Jahr (vom {from} bis zum {until}) herauszufinden, ob Interesse an einer einfachen Online-Terminbuchung für kleine
          Betriebe besteht, und die Software mit Rückmeldungen der Nutzer zu verbessern.
        </li>
        <li>Die Software befindet sich in Entwicklung. Sie ist kein fertiges, kommerzielles Produkt.</li>
      </ol>

      <h2 id="geltung">§ 2 Geltungsbereich und Nutzerkreis</h2>
      <ol>
        <li>
          Diese Nutzungsbedingungen gelten für alle Personen, die ein Konto bei Slotdove anlegen oder nutzen, insbesondere Inhaber von Betrieben und deren Teammitglieder (nachfolgend „Nutzer“). Für Kunden
          eines Betriebs, die über eine Buchungsseite einen Termin buchen, gelten die Bedingungen des jeweiligen Betriebs; sie werden nicht Vertragspartner des Betreibers.
        </li>
        <li>Nutzer müssen volljährig sein. Wer für einen Betrieb handelt, versichert, hierzu berechtigt zu sein.</li>
        <li>Abweichende Bedingungen der Nutzer gelten nicht.</li>
      </ol>

      <h2 id="zugang">§ 3 Zugang, Freigabe und Unterschrift</h2>
      <ol>
        <li>
          Während der Testphase ist eine Registrierung nur nach Voranmeldung und Freigabe durch den Betreiber oder auf Einladung eines bereits freigegebenen Betriebs möglich. Ein Anspruch auf Freigabe
          besteht nicht.
        </li>
        <li>
          Vor der Nutzung des Dashboards muss der Nutzer diesen Nutzungsbedingungen, der Datenschutzerklärung und – als Betrieb – dem Auftragsverarbeitungsvertrag ausdrücklich zustimmen und die
          Zustimmung durch Eingabe seines vollständigen Namens elektronisch unterzeichnen. Der Betreiber speichert Name, Zeitpunkt, Version der Texte und einen pseudonymisierten Netzwerk-Hash als
          Nachweis.
        </li>
        <li>Mit der Unterzeichnung kommt ein unentgeltlicher Nutzungsvertrag nach diesen Bedingungen zustande.</li>
      </ol>

      <h2 id="kostenlos">§ 4 Kostenlose Nutzung, keine Entgelte</h2>
      <ol>
        <li>
          Die Nutzung von Slotdove ist <strong>vollständig kostenlos</strong>. Der Betreiber verlangt kein Entgelt, schließt keine Abonnements ab und erhebt keine Zahlungsdaten. Nichts verlängert sich
          automatisch kostenpflichtig.
        </li>
        <li>
          Auf der Website genannte Preise sind lediglich unverbindliche Beispiele für eine mögliche spätere Weiterführung. Sollte Slotdove nach der Testphase jemals kostenpflichtig angeboten werden,
          geschieht dies nur durch einen neuen, gesonderten Vertrag, dem der Nutzer ausdrücklich zustimmen muss. Ohne diese Zustimmung entstehen niemals Kosten.
        </li>
        <li>
          Freiwillige Unterstützungen (z. B. über PayPal) sind möglich. Sie erfolgen ohne Gegenleistung, begründen keine Ansprüche, haben keinen Einfluss auf die Nutzung und werden ausschließlich für
          die laufenden Kosten des Projekts verwendet. Es handelt sich nicht um Spenden im steuerlichen Sinn; eine Spendenquittung wird nicht ausgestellt. Versehentlich gezahlte Beträge werden auf
          Anfrage innerhalb von 14 Tagen erstattet.
        </li>
      </ol>

      <h2 id="leistung">§ 5 Leistungsumfang „wie besehen“</h2>
      <ol>
        <li>
          Slotdove stellt eine webbasierte Software für Online-Terminbuchung bereit (u. a. Buchungsseite, Kalender, Kunden- und Teamverwaltung, E-Mail-Benachrichtigungen, Chat, Auswertungen, KI-Funktionen).
        </li>
        <li>
          Die Bereitstellung erfolgt <strong>unentgeltlich und „wie besehen“</strong>. Ein bestimmter Funktionsumfang, eine bestimmte Verfügbarkeit, Fehlerfreiheit, Reaktionszeiten oder die
          Fortführung des Projekts werden nicht geschuldet. Funktionen können jederzeit geändert, eingeschränkt oder eingestellt werden.
        </li>
        <li>Der Betreiber bemüht sich, Wartungsarbeiten anzukündigen und Störungen zügig zu beheben, ist hierzu aber nicht verpflichtet.</li>
      </ol>

      <h2 id="termine">§ 6 Termine, Ausfälle und eigene Vorsorge</h2>
      <ol>
        <li>
          Slotdove ist ein Hilfsmittel. <strong>Für die Organisation, Bestätigung, Durchführung und Absage von Terminen ist ausschließlich der jeweilige Betrieb verantwortlich</strong> – auch gegenüber
          seinen Kunden. Der Betreiber ist nicht Partei der Verträge zwischen Betrieben und deren Kunden.
        </li>
        <li>
          Der Nutzer nimmt zur Kenntnis, dass es insbesondere zu folgenden Problemen kommen kann: Ausfall oder Nichterreichbarkeit der Website, fehlerhafte Anzeige freier Zeiten, Doppelbuchungen,
          verlorene, verspätete oder falsch angezeigte Termine, nicht oder verspätet zugestellte E-Mails (Bestätigungen, Erinnerungen, Absagen), Fehler durch Zeitumstellungen oder Feiertage, Fehler
          von KI-Vorschlägen sowie Datenverlust.
        </li>
        <li>
          Der Nutzer verpflichtet sich daher, wichtige Termine und Kundendaten <strong>zusätzlich selbst festzuhalten</strong>, Buchungen bei Bedarf selbst gegenüber Kunden zu bestätigen und seine
          Daten regelmäßig über die Exportfunktion zu sichern.
        </li>
      </ol>

      <h2 id="pflichten">§ 7 Pflichten der Nutzer</h2>
      <ol>
        <li>Nutzer sind für alle Inhalte ihrer Buchungsseite (Texte, Preise, Bilder, Öffnungszeiten) und ihre Nachrichten selbst verantwortlich.</li>
        <li>
          Betriebe erfüllen ihre rechtlichen Pflichten gegenüber ihren Kunden selbst, insbesondere eigene Datenschutzinformationen, ggf. ein eigenes Impressum, Preisangaben, Storno- und
          Widerrufsregelungen sowie berufsrechtliche Vorgaben.
        </li>
        <li>Es dürfen keine Gesundheitsdaten oder andere besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) in Freitextfelder eingetragen werden, soweit dies nicht zwingend nötig und zulässig ist.</li>
        <li>Betriebe informieren ihre Teammitglieder, für die sie Zugänge anlegen, über die Datenverarbeitung.</li>
        <li>Nutzer melden erkannte Fehler, Sicherheitslücken und Missbrauch unverzüglich an {OPERATOR.email}.</li>
      </ol>

      <h2 id="inhalte">§ 8 Inhalte und Nutzungsrechte</h2>
      <ol>
        <li>Rechte an den Inhalten der Nutzer verbleiben bei den Nutzern. Der Nutzer räumt dem Betreiber das einfache, auf die Nutzungsdauer beschränkte Recht ein, diese Inhalte zu speichern und anzuzeigen, soweit dies für den Dienst nötig ist.</li>
        <li>Der Nutzer versichert, die erforderlichen Rechte an hochgeladenen Inhalten zu besitzen (Urheber-, Marken- und Persönlichkeitsrechte).</li>
        <li>Software, Design und Logo von Slotdove dürfen nur im Rahmen dieser Bedingungen genutzt werden. Automatisiertes Auslesen und Umgehen von Schutzmaßnahmen sind untersagt.</li>
      </ol>

      <h2 id="verboten">§ 9 Verbotene Nutzung</h2>
      <p>Untersagt ist insbesondere:</p>
      <ul>
        <li>das Anbieten rechtswidriger Leistungen oder das Veröffentlichen rechtswidriger, beleidigender, diskriminierender, gewaltverherrlichender oder pornografischer Inhalte;</li>
        <li>die Verletzung von Rechten Dritter, Spam, unerlaubte Werbung (§ 7 UWG), Phishing oder Schadsoftware;</li>
        <li>Fake-Buchungen, Täuschung oder irreführende Angaben;</li>
        <li>Angriffe auf die Sicherheit oder Stabilität des Dienstes, Zugriffe auf fremde Konten und das Umgehen von Ratenbegrenzungen;</li>
        <li>die Weitervermarktung des Dienstes an Dritte.</li>
      </ul>

      <h2 id="moderation">§ 10 Meldeverfahren, Moderation und Sperrung (DSA)</h2>
      <ol>
        <li>
          Rechtswidrige Inhalte können jederzeit über das <Link href="/melden">Meldeformular</Link> gemeldet werden (Art. 16 DSA). Meldungen werden zeitnah, sorgfältig und objektiv geprüft.
        </li>
        <li>
          Bei Verstößen gegen Gesetze oder diese Bedingungen kann der Betreiber verhältnismäßig Inhalte entfernen, Funktionen einschränken, Buchungsseiten deaktivieren oder Konten sperren. Betroffene
          erhalten eine Begründung (Art. 17 DSA) und können innerhalb von sechs Monaten widersprechen.
        </li>
        <li>Automatische Filter (z. B. gegen Spam) werden nur unterstützend eingesetzt; über Kontosperrungen entscheidet ein Mensch.</li>
      </ol>

      <h2 id="ki">§ 11 KI-Funktionen</h2>
      <p>
        KI-Ergebnisse (z. B. Textvorschläge, Antworten der Assistentin) können falsch oder unvollständig sein. Sie sind als KI-Vorschlag gekennzeichnet und vor der Verwendung zu prüfen. Für
        veröffentlichte Inhalte bleibt der Nutzer verantwortlich. In KI-Anfragen dürfen keine Gesundheitsdaten eingegeben werden.
      </p>

      <h2 id="datenschutz">§ 12 Datenschutz und Auftragsverarbeitung</h2>
      <p>
        Soweit der Betreiber Daten der Kunden und Teammitglieder eines Betriebs verarbeitet, handelt er als Auftragsverarbeiter nach dem <Link href="/avv">Auftragsverarbeitungsvertrag</Link>, der mit
        der Unterzeichnung geschlossen wird. Im Übrigen gilt die <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2 id="sicherheit">§ 13 Zugangsdaten und Sicherheit</h2>
      <ol>
        <li>Zugangsdaten sind geheim zu halten. Jede Person nutzt einen eigenen Zugang. Passwörter müssen mindestens 12 Zeichen lang sein.</li>
        <li>Bei Verdacht auf Missbrauch ist das Passwort sofort zu ändern und der Betreiber zu informieren. Der Betreiber darf Zugänge bei konkretem Missbrauchsverdacht vorübergehend sperren.</li>
      </ol>

      <h2 id="haftung">§ 14 Haftung</h2>
      <ol>
        <li>
          Da Slotdove unentgeltlich bereitgestellt wird, haftet der Betreiber – entsprechend den gesetzlichen Wertungen für unentgeltliche Leistungen (§§ 521, 599 BGB) – <strong>nur für Vorsatz und
          grobe Fahrlässigkeit</strong>.
        </li>
        <li>
          Insbesondere besteht – vorbehaltlich Abs. 3 – <strong>keine Haftung</strong> für: ausgefallene, verspätete, doppelte, falsch angezeigte oder verlorene Termine; nicht erschienene Kunden;
          nicht oder verspätet zugestellte E-Mails; entgangene Umsätze oder Gewinne; Folgeschäden; Ausfallzeiten und Störungen; Fehler von KI-Funktionen; Inhalte und Handlungen anderer Nutzer oder
          deren Kunden; Datenverlust, soweit er durch die nach § 6 Abs. 3 geschuldete eigene Datensicherung vermeidbar gewesen wäre.
        </li>
        <li>
          Unberührt bleiben die Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, für arglistig verschwiegene Mängel, nach dem Produkthaftungsgesetz sowie die Haftung
          nach Art. 82 DSGVO. Diese Haftung kann gesetzlich nicht ausgeschlossen werden.
        </li>
        <li>Die vorstehenden Regelungen gelten auch zugunsten von Personen, die der Betreiber zur Erbringung des Dienstes einsetzt.</li>
      </ol>

      <h2 id="freistellung">§ 15 Freistellung</h2>
      <p>
        Der Nutzer stellt den Betreiber von Ansprüchen Dritter (insbesondere seiner Kunden und von Behörden) frei, die auf einer schuldhaften Verletzung dieser Bedingungen oder geltenden Rechts durch den
        Nutzer beruhen, einschließlich angemessener Kosten der Rechtsverteidigung.
      </p>

      <h2 id="ende">§ 16 Laufzeit, Beendigung und Ende der Testphase</h2>
      <ol>
        <li>Der Nutzer kann den Vertrag jederzeit ohne Frist beenden, insbesondere durch Löschung seines Kontos im Dashboard.</li>
        <li>
          Der Betreiber kann den Vertrag oder das gesamte Projekt mit einer Frist von vier Wochen beenden; aus wichtigem Grund (z. B. schwere Verstöße, Sicherheitsrisiken) auch fristlos.
        </li>
        <li>
          Die Testphase endet voraussichtlich am {until}. Der Betreiber informiert die Nutzer mindestens vier Wochen vorher, ob und wie es weitergeht. Bis zum Ende können alle Daten exportiert werden;
          danach werden sie nach Ankündigung gelöscht, frühestens 30 Tage nach Ende.
        </li>
      </ol>

      <h2 id="aenderung">§ 17 Änderungen dieser Bedingungen</h2>
      <p>
        Änderungen werden mindestens vier Wochen vor Inkrafttreten im Dashboard oder per E-Mail mitgeteilt. Wesentliche Änderungen müssen erneut ausdrücklich bestätigt und unterzeichnet werden; bis
        dahin kann das Dashboard nicht weiter genutzt werden. Der Nutzer kann stattdessen sein Konto löschen.
      </p>

      <h2 id="schluss">§ 18 Schlussbestimmungen</h2>
      <ol>
        <li>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</li>
        <li>Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand – soweit zulässig – Ratzeburg.</li>
        <li>Der Betreiber nimmt nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil (§ 36 VSBG).</li>
        <li>Sind einzelne Bestimmungen unwirksam, bleibt der Vertrag im Übrigen wirksam; an die Stelle tritt die gesetzliche Regelung.</li>
      </ol>
    </LegalPage>
  );
}
