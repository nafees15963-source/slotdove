import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage, Ph } from '@/components/legal';
export const metadata: Metadata = { title: 'Datenschutzerklärung – Slotdove', description: 'Informationen nach Art. 13 und 14 DSGVO zur Verarbeitung personenbezogener Daten bei Slotdove.' };

const toc: [string, string][] = [
  ['verantwortlicher', 'Verantwortlicher und Kontakt'],
  ['ueberblick', 'Überblick: Wer ist wofür verantwortlich?'],
  ['begriffe', 'Rechtsgrundlagen im Überblick'],
  ['hosting', 'Bereitstellung der Website und Server-Logdateien'],
  ['cookies', 'Cookies und lokale Speicherung (TDDDG)'],
  ['konto', 'Registrierung, Kundenkonto und Anmeldung'],
  ['mitarbeiter', 'Teammitglieder und Mitarbeiter-Zugänge'],
  ['buchung', 'Online-Buchungen über Buchungsseiten der Betriebe'],
  ['emails', 'Automatische E-Mails (Bestätigungen, Erinnerungen)'],
  ['chat', 'Kunden-Chat und automatische Moderation'],
  ['ki', 'KI-Funktionen (Assistentin, Textvorschläge)'],
  ['warteliste', 'Warteliste / Frühzugang'],
  ['support', 'Support-Anfragen und Kontakt'],
  ['meldungen', 'Meldungen, Sperrlisten und Missbrauchsschutz'],
  ['sicherheit', 'Sicherheitsprotokolle, Ratenbegrenzung und Audit'],
  ['empfaenger', 'Empfänger und Auftragsverarbeiter'],
  ['drittland', 'Übermittlungen in Drittländer'],
  ['speicherdauer', 'Speicherdauer und Löschung'],
  ['rechte', 'Ihre Rechte'],
  ['widerspruch', 'Widerspruchsrecht nach Art. 21 DSGVO'],
  ['beschwerde', 'Beschwerderecht bei einer Aufsichtsbehörde'],
  ['pflicht', 'Pflicht zur Bereitstellung, automatisierte Entscheidungen'],
  ['minderjaehrige', 'Minderjährige'],
  ['tom', 'Datensicherheit'],
  ['aenderungen', 'Änderungen dieser Datenschutzerklärung'],
];

export default function Page() {
  return (
    <LegalPage title="Datenschutzerklärung" toc={toc}>
      <p>
        Der Schutz Ihrer personenbezogenen Daten ist uns sehr wichtig. Nachfolgend informieren wir Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) darüber, welche personenbezogenen Daten
        wir bei der Nutzung von Slotdove (Website, Web-App, Buchungsseiten und E-Mails) verarbeiten, zu welchen Zwecken, auf welcher Rechtsgrundlage, an wen wir sie weitergeben, wie lange wir sie speichern
        und welche Rechte Sie haben.
      </p>

      <h2 id="verantwortlicher">1. Verantwortlicher und Kontakt</h2>
      <p>
        Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO für die Verarbeitungen, die Slotdove als eigene Plattform betreibt:
        <br />
        <Ph>VOR- UND NACHNAME</Ph>
        <br />
        <Ph>STRASSE UND HAUSNUMMER</Ph>, <Ph>PLZ ORT</Ph>, Deutschland
        <br />
        E-Mail: <Ph>E-MAIL-ADRESSE</Ph> · Telefon: <Ph>TELEFONNUMMER</Ph>
      </p>
      <p>
        Datenschutzanfragen richten Sie bitte an <Ph>DATENSCHUTZ-E-MAIL (kann dieselbe Adresse sein)</Ph>. Ein Datenschutzbeauftragter ist nach Art. 37 DSGVO i. V. m. § 38 BDSG derzeit nicht benannt,
        da die gesetzlichen Voraussetzungen nicht vorliegen. <Ph>Falls doch benannt: Name und Kontakt des Datenschutzbeauftragten</Ph>
      </p>

      <h2 id="ueberblick">2. Überblick: Wer ist wofür verantwortlich?</h2>
      <p>Slotdove ist eine Software für Online-Terminbuchung, die von Unternehmen (z. B. Salons, Praxen, Studios, Dienstleistern – nachfolgend „Betriebe“) genutzt wird. Dabei gibt es zwei Rollen:</p>
      <ul>
        <li>
          <strong>Slotdove als Verantwortlicher</strong> für die eigene Website, die Registrierung und Verwaltung der Konten von Betrieben und deren Teammitgliedern, die Warteliste, Support, Abrechnung,
          Sicherheit, Missbrauchsbekämpfung sowie Meldungen nach dem Digital Services Act.
        </li>
        <li>
          <strong>Slotdove als Auftragsverarbeiter</strong> (Art. 28 DSGVO) für die Daten, die Betriebe über ihre Kundinnen und Kunden verarbeiten – also Buchungen, Kundenkartei, Notizen,
          Chatnachrichten und Terminerinnerungen. Verantwortlich für diese Daten ist der jeweilige Betrieb, bei dem Sie einen Termin buchen. Mit jedem Betrieb schließen wir einen{' '}
          <Link href="/avv">Auftragsverarbeitungsvertrag (AVV)</Link>. Wenn Sie als Kundin oder Kunde Auskunft, Löschung oder Berichtigung wünschen, wenden Sie sich bitte vorrangig an den Betrieb; wir
          unterstützen den Betrieb dabei und leiten an uns gerichtete Anfragen unverzüglich weiter.
        </li>
      </ul>

      <h2 id="begriffe">3. Rechtsgrundlagen im Überblick</h2>
      <ul>
        <li>Art. 6 Abs. 1 lit. a DSGVO – Einwilligung (jederzeit mit Wirkung für die Zukunft widerruflich);</li>
        <li>Art. 6 Abs. 1 lit. b DSGVO – Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen;</li>
        <li>Art. 6 Abs. 1 lit. c DSGVO – Erfüllung rechtlicher Pflichten (z. B. handels- und steuerrechtliche Aufbewahrung, Pflichten aus dem DSA);</li>
        <li>Art. 6 Abs. 1 lit. f DSGVO – berechtigte Interessen (z. B. IT-Sicherheit, Missbrauchsabwehr, Verbesserung des Dienstes), soweit nicht Ihre Interessen überwiegen;</li>
        <li>§ 25 Abs. 1 und 2 TDDDG – Speicherung von und Zugriff auf Informationen in Ihrem Endgerät.</li>
      </ul>

      <h2 id="hosting">4. Bereitstellung der Website und Server-Logdateien</h2>
      <p>
        Beim Aufruf unserer Website verarbeitet unser Hosting-Anbieter technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene URL, Referrer-URL, übertragene Datenmenge, HTTP-Statuscode,
        Browsertyp und -version sowie Betriebssystem. Diese Daten sind erforderlich, um die Website auszuliefern, die Stabilität und Sicherheit zu gewährleisten und Angriffe (z. B. DDoS) abzuwehren.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der sicheren und fehlerfreien Bereitstellung. Hosting-Anbieter ist die Vercel Inc., 440 N Barranca Ave #4133,
        Covina, CA 91723, USA. Server-Logs werden von Vercel nur kurzzeitig vorgehalten (in der Regel wenige Tage) und danach gelöscht.
      </p>

      <h2 id="cookies">5. Cookies und lokale Speicherung (TDDDG)</h2>
      <p>
        Wir verwenden <strong>ausschließlich technisch notwendige</strong> Cookies und Speichermechanismen. Wir setzen <strong>keine</strong> Analyse-, Tracking-, Marketing- oder Social-Media-Cookies ein und
        binden keine Werbenetzwerke ein. Ein Cookie-Banner ist daher nicht erforderlich; die Speicherung ist nach § 25 Abs. 2 Nr. 2 TDDDG zulässig, da sie unbedingt erforderlich ist, um den von Ihnen
        ausdrücklich gewünschten Dienst bereitzustellen.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Zweck</th>
            <th>Dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-…-auth-token</td>
            <td>Anmeldung / Sitzung (Supabase Auth), nur wenn Sie eingeloggt sind</td>
            <td>bis Abmeldung bzw. Ablauf der Sitzung</td>
          </tr>
          <tr>
            <td>slotdove-locale</td>
            <td>gewählte Sprache (Deutsch/Englisch)</td>
            <td>1 Jahr</td>
          </tr>
          <tr>
            <td>slotdove-business</td>
            <td>zuletzt gewählter Betrieb im Dashboard</td>
            <td>1 Jahr</td>
          </tr>
          <tr>
            <td>localStorage: slotdove-tours-off, slotdove-dismissed</td>
            <td>merkt sich, dass Sie Tutorials/Hinweise geschlossen haben</td>
            <td>bis Sie den Browserspeicher löschen</td>
          </tr>
        </tbody>
      </table>

      <h2 id="konto">6. Registrierung, Kundenkonto und Anmeldung</h2>
      <p>
        Wenn Sie als Betrieb ein Konto anlegen, verarbeiten wir E-Mail-Adresse, Passwort (ausschließlich als sicherer Hash, nie im Klartext), Name, Angaben zum Betrieb (Name, Branche, Adresse, Telefon,
        Öffnungszeiten, Leistungen, Preise, Logo, Bilder), Spracheinstellung, gewählter Tarif sowie Zeitpunkte der Zustimmung zu AGB, Datenschutzerklärung und AVV (inkl. Versionsnummer und
        pseudonymisiertem IP-Hash als Nachweis). Zweck ist die Bereitstellung des Dienstes; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, für die Nachweise Art. 6 Abs. 1 lit. c und f DSGVO
        (Rechenschaftspflicht, Art. 5 Abs. 2 DSGVO).
      </p>
      <p>
        Zur Bestätigung der E-Mail-Adresse und zum Zurücksetzen des Passworts versenden wir Systemnachrichten. Für Administratoren der Plattform ist eine Zwei-Faktor-Authentifizierung (TOTP) vorgesehen.
      </p>

      <h2 id="mitarbeiter">7. Teammitglieder und Mitarbeiter-Zugänge</h2>
      <p>
        Betriebe können Teammitglieder per Einladung hinzufügen oder selbst einen Zugang anlegen. Dabei werden Name, E-Mail-Adresse, Rolle und die Zuordnung zu Leistungen und Arbeitszeiten gespeichert.
        Ein vom Betrieb vergebenes Startpasswort muss bei der ersten Anmeldung geändert werden; es wird von uns nicht im Klartext gespeichert. Der Betrieb ist verpflichtet, seine Beschäftigten über die
        Verarbeitung zu informieren (§ 26 BDSG, Art. 88 DSGVO). Rechtsgrundlage auf unserer Seite ist Art. 6 Abs. 1 lit. b und f DSGVO.
      </p>

      <h2 id="buchung">8. Online-Buchungen über Buchungsseiten der Betriebe</h2>
      <p>
        Wenn Sie über die Buchungsseite eines Betriebs einen Termin buchen, verarbeiten wir <strong>im Auftrag des Betriebs</strong>: Name, E-Mail-Adresse, optional Telefonnummer und Anmerkungen, gewählte
        Leistung, Mitarbeiter, Datum und Uhrzeit, Buchungsnummer und Status sowie technische Daten zur Missbrauchsabwehr (pseudonymisierter IP-Hash, Ratenbegrenzung). Verantwortlich ist der Betrieb
        (Kontaktdaten auf dessen Buchungsseite). Rechtsgrundlage für den Betrieb ist in der Regel Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Sie erhalten einen privaten Verwaltungslink, mit dem Sie den Termin ansehen, verschieben oder absagen können. Der Link enthält einen zufälligen Schlüssel, den wir nur als Hash speichern; er läuft
        sieben Tage nach dem Termin ab. Bitte geben Sie in Anmerkungen keine Gesundheitsdaten oder andere besondere Kategorien personenbezogener Daten an, sofern der Betrieb dies nicht ausdrücklich
        erfordert.
      </p>

      <h2 id="emails">9. Automatische E-Mails (Bestätigungen, Erinnerungen)</h2>
      <p>
        Für Buchungsbestätigungen, Erinnerungen, Änderungs- und Absagebenachrichtigungen, Einladungen und Systemnachrichten nutzen wir den Versanddienstleister Resend (Resend Inc., 2261 Market Street
        #5039, San Francisco, CA 94114, USA). Verarbeitet werden E-Mail-Adresse, Name, Inhalt der Nachricht und Zustellstatus. Wir versenden <strong>keine Werbe-Newsletter</strong>. Transaktionale
        E-Mails sind für die Vertragserfüllung erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Betriebe können Erinnerungen in den Einstellungen abschalten.
      </p>

      <h2 id="chat">10. Kunden-Chat und automatische Moderation</h2>
      <p>
        Kundinnen und Kunden können über ihren Verwaltungslink mit dem Betrieb chatten. Nachrichten werden gespeichert, um die Kommunikation zu ermöglichen (Art. 6 Abs. 1 lit. b DSGVO, im Auftrag des
        Betriebs). Zum Schutz vor Beleidigungen, Spam und rechtswidrigen Inhalten prüft ein lokales, regelbasiertes Filtersystem eingehende Nachrichten automatisch; auffällige Nachrichten können
        markiert, zurückgehalten oder gemeldet werden. Diese Prüfung findet auf unseren Servern statt; es werden dafür keine Daten an externe KI-Anbieter übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO (Schutz der Nutzer und der Plattform) sowie Art. 6 Abs. 1 lit. c DSGVO i. V. m. dem DSA.
      </p>

      <h2 id="ki">11. KI-Funktionen (Assistentin, Textvorschläge)</h2>
      <p>
        Slotdove bietet Betrieben optionale KI-Funktionen, z. B. eine Assistentin im Dashboard und Formulierungsvorschläge für Leistungsbeschreibungen. Gemäß Art. 50 der KI-Verordnung (EU) 2024/1689
        weisen wir darauf hin: <strong>Sie interagieren dabei mit einem KI-System.</strong> KI-generierte Vorschläge sind als solche gekennzeichnet und sollten vor der Verwendung geprüft werden.
      </p>
      <p>
        Viele Funktionen (z. B. automatische Leistungsbilder, Terminvorschläge, Moderation) laufen mit einer <strong>lokalen Logik ohne externe Übermittlung</strong>. Für die Chat-Assistentin kann eine
        Anfrage an den Anbieter Groq, Inc. (USA) übermittelt werden, der ein Sprachmodell bereitstellt. Übermittelt werden die eingegebene Frage und der für die Antwort nötige Kontext aus dem Konto des
        Betriebs (z. B. Termine eines Zeitraums). Groq verarbeitet die Daten auf Grundlage eines Auftragsverarbeitungsvertrags mit EU-Standardvertragsklauseln und nutzt sie nach eigenen Angaben nicht zum
        Training seiner Modelle. Betriebe sollten keine besonderen Kategorien personenbezogener Daten (z. B. Gesundheitsdaten) in KI-Anfragen eingeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; die
        Nutzung der KI ist freiwillig.
      </p>
      <p>Es findet keine automatisierte Entscheidungsfindung im Sinne des Art. 22 DSGVO statt.</p>

      <h2 id="warteliste">12. Warteliste / Frühzugang</h2>
      <p>
        Wenn Sie sich auf die Warteliste eintragen, verarbeiten wir Name, E-Mail-Adresse, optional Betrieb, Branche, Telefonnummer und Nachricht sowie den Zeitpunkt Ihrer Einwilligung. Wir nutzen die
        Daten ausschließlich, um Sie über den Start bzw. Ihren Frühzugang zu informieren. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit per E-Mail widerrufen
        können. Einträge, die nicht zu einem Konto führen, löschen wir spätestens nach 12 Monaten.
      </p>

      <h2 id="support">13. Support-Anfragen und Kontakt</h2>
      <p>
        Bei Support-Anfragen (im Dashboard oder per E-Mail) verarbeiten wir Ihre Angaben und den Verlauf, um Ihr Anliegen zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Mit Ihrer ausdrücklichen
        Freigabe kann ein Plattform-Administrator für einen begrenzten Zeitraum lesend auf Ihr Konto zugreifen, um ein Problem nachzuvollziehen; jeder Zugriff wird protokolliert.
      </p>

      <h2 id="meldungen">14. Meldungen, Sperrlisten und Missbrauchsschutz</h2>
      <p>
        Wir betreiben ein Melde- und Abhilfeverfahren nach Art. 16 DSA. Wer einen Inhalt oder ein Verhalten meldet, gibt eine Beschreibung, optional eine URL sowie optional Name und E-Mail-Adresse an.
        Betriebe können auch Kundinnen und Kunden melden (z. B. wiederholtes Nichterscheinen, Beleidigungen, Betrug) und für ihren eigenen Betrieb von der Online-Buchung ausschließen. Wir prüfen Meldungen
        sorgfältig, entscheiden begründet (Art. 17 DSA) und informieren die Beteiligten, soweit Kontaktdaten vorliegen.
      </p>
      <p>
        Zur Abwehr von Missbrauch (Spam, Betrug, Angriffe) führen wir eine Sperrliste aus E-Mail-Adressen, Domains und pseudonymisierten IP-Hashes. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO i. V. m.
        Art. 16, 17 und 23 DSA sowie Art. 6 Abs. 1 lit. f DSGVO (Schutz der Nutzer und der Integrität der Plattform). Meldungen werden nach Abschluss drei Jahre aufbewahrt, um wiederholten Missbrauch
        erkennen und unsere Entscheidungen nachweisen zu können.
      </p>

      <h2 id="sicherheit">15. Sicherheitsprotokolle, Ratenbegrenzung und Audit</h2>
      <p>
        Zur Sicherheit protokollieren wir sicherheitsrelevante Ereignisse (z. B. Anmeldungen, Passwortänderungen, Rollenwechsel, administrative Eingriffe) mit Zeitpunkt, Benutzerkennung, User-Agent und
        einem <strong>pseudonymisierten IP-Hash</strong> (HMAC, kein Klartext-IP). Aktivitätsprotokolle werden nach 180 Tagen gelöscht, Zähler der Ratenbegrenzung nach einem Tag. Administrative Eingriffe
        werden in einem Audit-Protokoll revisionssicher festgehalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO und Art. 32 DSGVO.
      </p>

      <h2 id="empfaenger">16. Empfänger und Auftragsverarbeiter</h2>
      <p>Wir geben Daten nur weiter, wenn dies für die genannten Zwecke erforderlich ist. Wir setzen folgende Dienstleister als Auftragsverarbeiter (Art. 28 DSGVO) ein:</p>
      <table>
        <thead>
          <tr>
            <th>Anbieter</th>
            <th>Zweck</th>
            <th>Ort / Garantien</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc., 970 Toa Payoh North #07-04, Singapur 318992</td>
            <td>Datenbank, Authentifizierung, Dateispeicher</td>
            <td>Datenhaltung in der EU (Frankfurt am Main, AWS eu-central-1); AVV mit EU-Standardvertragsklauseln für etwaige Supportzugriffe</td>
          </tr>
          <tr>
            <td>Vercel Inc., USA</td>
            <td>Hosting, Auslieferung der Website, Serverfunktionen</td>
            <td>EU-U.S. Data Privacy Framework (DPF) und EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Resend Inc., USA</td>
            <td>Versand transaktionaler E-Mails</td>
            <td>EU-U.S. Data Privacy Framework und EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Groq, Inc., USA</td>
            <td>Sprachmodell für die optionale KI-Assistentin</td>
            <td>AVV mit EU-Standardvertragsklauseln (Modul 2/3)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Darüber hinaus können Daten an Behörden weitergegeben werden, wenn wir hierzu gesetzlich verpflichtet sind (z. B. Art. 10 DSA, Strafverfolgung), sowie an Steuerberater im Rahmen der
        gesetzlichen Pflichten. <Ph>Falls genutzt: Zahlungsdienstleister (z. B. Stripe, PayPal) mit Zweck und Sitz ergänzen</Ph>
      </p>

      <h2 id="drittland">17. Übermittlungen in Drittländer</h2>
      <p>
        Soweit Dienstleister ihren Sitz in den USA haben oder dort Daten verarbeiten, erfolgt die Übermittlung auf Grundlage eines Angemessenheitsbeschlusses (Art. 45 DSGVO, EU-U.S. Data Privacy
        Framework), soweit der Anbieter zertifiziert ist, und im Übrigen auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) mit ergänzenden Maßnahmen (Verschlüsselung bei der
        Übertragung und im Ruhezustand, Datenminimierung). Eine Kopie der Garantien können Sie bei uns anfordern.
      </p>

      <h2 id="speicherdauer">18. Speicherdauer und Löschung</h2>
      <ul>
        <li>Kontodaten: für die Dauer des Vertrags; nach Kündigung Löschung innerhalb von 30 Tagen, soweit keine Aufbewahrungspflichten bestehen.</li>
        <li>Buchungs- und Kundendaten der Betriebe: nach Weisung des Betriebs; nach Vertragsende Rückgabe/Export und Löschung innerhalb von 30 Tagen.</li>
        <li>Rechnungen und Buchhaltungsbelege: 8 bzw. 10 Jahre (§ 147 AO, § 257 HGB).</li>
        <li>Warteliste: bis zum Widerruf, spätestens 12 Monate ohne Kontoeröffnung.</li>
        <li>Aktivitäts- und Sicherheitsprotokolle: 180 Tage; Ratenbegrenzung: 1 Tag.</li>
        <li>Meldungen nach DSA und Datenschutzanfragen: 3 Jahre nach Abschluss (Nachweis, Verjährung).</li>
        <li>Sperrlisteneinträge: bis zum festgelegten Ablaufdatum bzw. solange der Missbrauchsgrund besteht.</li>
        <li>Backups: werden rollierend überschrieben (in der Regel nach spätestens 7–30 Tagen).</li>
      </ul>

      <h2 id="rechte">19. Ihre Rechte</h2>
      <p>Sie haben jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO);</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO);</li>
        <li>Löschung (Art. 17 DSGVO), soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen;</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO);</li>
        <li>Datenübertragbarkeit in einem strukturierten, gängigen, maschinenlesbaren Format (Art. 20 DSGVO) – im Konto unter „Konto → Meine Daten exportieren“;</li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO);</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO).</li>
      </ul>
      <p>
        Ihr Konto können Sie jederzeit selbst unter „Konto“ löschen. Anfragen beantworten wir innerhalb eines Monats (Art. 12 Abs. 3 DSGVO). Zum Schutz Ihrer Daten können wir einen Identitätsnachweis
        verlangen, wenn begründete Zweifel bestehen.
      </p>

      <h2 id="widerspruch">20. Widerspruchsrecht nach Art. 21 DSGVO</h2>
      <p>
        <strong>
          Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 Abs. 1 lit. f
          DSGVO erfolgt, Widerspruch einzulegen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die Ihre Interessen überwiegen, oder die
          Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
        </strong>
      </p>

      <h2 id="beschwerde">21. Beschwerderecht bei einer Aufsichtsbehörde</h2>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des
        mutmaßlichen Verstoßes. Für uns zuständig ist: <Ph>ZUSTÄNDIGE LANDESDATENSCHUTZBEHÖRDE des Bundeslandes Ihres Sitzes, mit Anschrift</Ph>.
      </p>

      <h2 id="pflicht">22. Pflicht zur Bereitstellung, automatisierte Entscheidungen</h2>
      <p>
        Die Angabe der als Pflichtfeld gekennzeichneten Daten ist für Registrierung bzw. Buchung erforderlich; ohne sie kann der Vertrag nicht geschlossen werden. Eine automatisierte Entscheidung
        einschließlich Profiling nach Art. 22 DSGVO findet nicht statt. Automatische Filter (z. B. Spam-Erkennung) führen nicht zu endgültigen Entscheidungen; über Sperrungen entscheidet ein Mensch.
      </p>

      <h2 id="minderjaehrige">23. Minderjährige</h2>
      <p>
        Die Registrierung als Betrieb ist nur volljährigen Personen gestattet. Buchungen für Minderjährige unter 16 Jahren sollen durch einen Erziehungsberechtigten erfolgen (Art. 8 DSGVO).
      </p>

      <h2 id="tom">24. Datensicherheit</h2>
      <p>
        Wir treffen technische und organisatorische Maßnahmen nach Art. 32 DSGVO, u. a.: TLS-Verschlüsselung (HSTS), Verschlüsselung der Datenbank im Ruhezustand, strikte Mandantentrennung durch
        Row-Level-Security, Passwort-Hashing, Mindestlänge für Passwörter, Ratenbegrenzung gegen Brute-Force, Content-Security-Policy gegen Cross-Site-Scripting, Prüfung hochgeladener Dateien,
        pseudonymisierte IP-Speicherung, rollenbasierte Zugriffe, Zwei-Faktor-Authentifizierung für Administratoren, Audit-Protokolle, regelmäßige Sicherheitsprüfungen sowie Backups. Details enthält
        Anlage 2 unseres <Link href="/avv">AVV</Link>.
      </p>

      <h2 id="aenderungen">25. Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich unser Dienst oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung. Über wesentliche Änderungen informieren wir
        registrierte Nutzer per E-Mail oder im Dashboard.
      </p>
    </LegalPage>
  );
}
