import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal';
import { OPERATOR } from '@/lib/operator';
export const metadata: Metadata = { title: 'Auftragsverarbeitungsvertrag (AVV) – Slotdove', description: 'Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO inkl. TOM und Unterauftragsverarbeitern.' };

export default function Page() {
  return (
    <LegalPage
      title="Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO"
      toc={[
        ['p1', 'Gegenstand, Dauer, Art und Zweck'],
        ['p2', 'Art der Daten und Kreis der Betroffenen'],
        ['p3', 'Weisungsbefugnis'],
        ['p4', 'Pflichten des Auftragsverarbeiters'],
        ['p5', 'Vertraulichkeit'],
        ['p6', 'Technische und organisatorische Maßnahmen'],
        ['p7', 'Unterauftragsverarbeiter'],
        ['p8', 'Unterstützung bei Betroffenenrechten'],
        ['p9', 'Meldung von Datenschutzverletzungen'],
        ['p10', 'Kontrollrechte'],
        ['p11', 'Drittlandübermittlungen'],
        ['p12', 'Löschung und Rückgabe'],
        ['p13', 'Haftung, Schlussbestimmungen'],
        ['a1', 'Anlage 1: Technische und organisatorische Maßnahmen'],
        ['a2', 'Anlage 2: Genehmigte Unterauftragsverarbeiter'],
      ]}
    >
      <p>
        zwischen dem Kunden von Slotdove (Betrieb) – nachfolgend <strong>„Verantwortlicher“</strong> – und {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city} (Betreiber des privaten Testprojekts „Slotdove“) – nachfolgend{' '}
        <strong>„Auftragsverarbeiter“</strong>.
      </p>
      <p>
        Dieser Vertrag wird elektronisch mit der Registrierung bzw. durch Bestätigung im Konto geschlossen (Art. 28 Abs. 9 DSGVO). Er konkretisiert die datenschutzrechtlichen Pflichten der Parteien aus
        dem Hauptvertrag (<Link href="/agb">AGB</Link>). Im Fall von Widersprüchen geht dieser AVV vor.
      </p>

      <h2 id="p1">§ 1 Gegenstand, Dauer, Art und Zweck der Verarbeitung</h2>
      <ol>
        <li>
          Gegenstand ist die Bereitstellung der Software Slotdove für Online-Terminbuchung, Termin-, Kunden- und Teamverwaltung, den Versand transaktionaler E-Mails, den Kunden-Chat sowie optionale
          KI-Funktionen.
        </li>
        <li>Art der Verarbeitung: Erheben, Erfassen, Speichern, Ordnen, Anpassen, Auslesen, Abfragen, Verwenden, Übermitteln (E-Mail-Versand), Einschränken, Löschen.</li>
        <li>Zweck: Ermöglichung der Terminbuchung zwischen dem Verantwortlichen und seinen Kunden sowie die Organisation seines Betriebs.</li>
        <li>Die Dauer entspricht der Laufzeit des Hauptvertrags zuzüglich der Abwicklungsfrist nach § 12.</li>
      </ol>

      <h2 id="p2">§ 2 Art der personenbezogenen Daten und Kreis der Betroffenen</h2>
      <table>
        <thead>
          <tr>
            <th>Betroffene</th>
            <th>Datenkategorien</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kundinnen und Kunden (Endkunden) des Verantwortlichen</td>
            <td>Name, E-Mail, Telefon, Termine (Leistung, Zeit, Mitarbeiter, Status, Buchungsnummer), Anmerkungen, interne Notizen, Chatnachrichten, Zustellstatus von E-Mails, Sperrvermerk</td>
          </tr>
          <tr>
            <td>Beschäftigte des Verantwortlichen</td>
            <td>Name, E-Mail, Rolle, Arbeitszeiten, Abwesenheiten, zugeordnete Leistungen, Anmelde- und Aktivitätsdaten</td>
          </tr>
          <tr>
            <td>Ansprechpartner des Verantwortlichen</td>
            <td>Name, Kontaktdaten, Support-Verläufe</td>
          </tr>
        </tbody>
      </table>
      <p>
        Die Verarbeitung besonderer Kategorien personenbezogener Daten (Art. 9 DSGVO) ist nicht Gegenstand dieses Vertrags. Soweit der Verantwortliche solche Daten dennoch in Freitextfelder eingibt,
        trägt er die Verantwortung für die Zulässigkeit.
      </p>

      <h2 id="p3">§ 3 Weisungsbefugnis</h2>
      <ol>
        <li>
          Der Auftragsverarbeiter verarbeitet personenbezogene Daten nur auf dokumentierte Weisung des Verantwortlichen, auch in Bezug auf Übermittlungen in Drittländer, es sei denn, er ist durch Unionsrecht
          oder das Recht eines Mitgliedstaats hierzu verpflichtet; in einem solchen Fall teilt er dem Verantwortlichen diese Anforderungen vor der Verarbeitung mit, sofern das Recht dies nicht verbietet
          (Art. 28 Abs. 3 lit. a DSGVO).
        </li>
        <li>Weisungen erteilt der Verantwortliche grundsätzlich durch die Nutzung und Konfiguration der Software sowie ergänzend in Textform.</li>
        <li>Ist der Auftragsverarbeiter der Ansicht, dass eine Weisung gegen Datenschutzvorschriften verstößt, informiert er den Verantwortlichen unverzüglich (Art. 28 Abs. 3 UAbs. 2 DSGVO).</li>
      </ol>

      <h2 id="p4">§ 4 Pflichten des Auftragsverarbeiters</h2>
      <ol>
        <li>Der Auftragsverarbeiter verarbeitet die Daten ausschließlich im Rahmen dieses Vertrags und nicht für eigene Zwecke, insbesondere nicht für Werbung oder das Training von KI-Modellen.</li>
        <li>Er gewährleistet eine strikte logische Trennung der Daten verschiedener Verantwortlicher (Mandantentrennung).</li>
        <li>Er führt ein Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 Abs. 2 DSGVO.</li>
        <li>Er unterstützt den Verantwortlichen bei der Einhaltung der Pflichten aus Art. 32 bis 36 DSGVO (Sicherheit, Meldungen, Datenschutz-Folgenabschätzung, Konsultation).</li>
        <li>Sofern gesetzlich erforderlich, benennt er einen Datenschutzbeauftragten. Kontakt für Datenschutzfragen: {OPERATOR.email}.</li>
      </ol>

      <h2 id="p5">§ 5 Vertraulichkeit</h2>
      <p>
        Der Auftragsverarbeiter gewährleistet, dass sich alle zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht
        unterliegen (Art. 28 Abs. 3 lit. b DSGVO). Die Pflicht besteht über das Vertragsende hinaus fort. Zugriffe von Administratoren auf Kundendaten erfolgen nur, soweit dies für Support, Sicherheit
        oder rechtliche Pflichten erforderlich ist, und werden protokolliert.
      </p>

      <h2 id="p6">§ 6 Technische und organisatorische Maßnahmen</h2>
      <p>
        Der Auftragsverarbeiter trifft die in <a href="#a1">Anlage 1</a> beschriebenen Maßnahmen nach Art. 32 DSGVO. Die Maßnahmen unterliegen dem technischen Fortschritt; der Auftragsverarbeiter darf
        sie durch gleichwertige oder bessere Maßnahmen ersetzen. Das Schutzniveau darf dabei nicht unterschritten werden.
      </p>

      <h2 id="p7">§ 7 Unterauftragsverarbeiter</h2>
      <ol>
        <li>Der Verantwortliche erteilt die allgemeine Genehmigung zum Einsatz weiterer Auftragsverarbeiter (Art. 28 Abs. 2 DSGVO). Die bei Vertragsschluss eingesetzten sind in Anlage 2 aufgeführt.</li>
        <li>
          Der Auftragsverarbeiter informiert den Verantwortlichen mindestens 30 Tage vor jeder beabsichtigten Änderung (Hinzuziehung oder Ersetzung) in Textform. Der Verantwortliche kann aus wichtigem
          datenschutzrechtlichem Grund innerhalb dieser Frist widersprechen. Kommt keine Einigung zustande, kann der Verantwortliche den Hauptvertrag außerordentlich kündigen.
        </li>
        <li>
          Der Auftragsverarbeiter erlegt jedem Unterauftragsverarbeiter vertraglich dieselben Datenschutzpflichten auf (Art. 28 Abs. 4 DSGVO) und haftet gegenüber dem Verantwortlichen für deren
          Einhaltung.
        </li>
      </ol>

      <h2 id="p8">§ 8 Unterstützung bei Betroffenenrechten</h2>
      <p>
        Der Auftragsverarbeiter unterstützt den Verantwortlichen mit geeigneten technischen und organisatorischen Maßnahmen bei der Erfüllung der Rechte der Betroffenen nach Kapitel III DSGVO (Art. 28
        Abs. 3 lit. e). Hierzu stehen in der Software u. a. Export einzelner Kunden (Auskunft/Datenübertragbarkeit), Bearbeiten (Berichtigung) und Anonymisieren (Löschung) zur Verfügung. Wenden sich
        Betroffene direkt an den Auftragsverarbeiter, leitet dieser die Anfrage unverzüglich an den Verantwortlichen weiter und beantwortet sie nicht selbst, soweit nicht anders vereinbart.
      </p>

      <h2 id="p9">§ 9 Meldung von Datenschutzverletzungen</h2>
      <p>
        Der Auftragsverarbeiter meldet dem Verantwortlichen eine Verletzung des Schutzes personenbezogener Daten unverzüglich, möglichst innerhalb von 24 Stunden nach Kenntnis, in Textform mit den
        Angaben nach Art. 33 Abs. 3 DSGVO, soweit verfügbar. Er ergreift unverzüglich Maßnahmen zur Eindämmung und unterstützt den Verantwortlichen bei dessen Melde- und Benachrichtigungspflichten (Art.
        33, 34 DSGVO).
      </p>

      <h2 id="p10">§ 10 Kontrollrechte</h2>
      <p>
        Der Auftragsverarbeiter stellt dem Verantwortlichen alle erforderlichen Informationen zum Nachweis der Einhaltung der Pflichten zur Verfügung und ermöglicht Überprüfungen einschließlich
        Inspektionen durch den Verantwortlichen oder einen von ihm beauftragten, zur Verschwiegenheit verpflichteten Prüfer (Art. 28 Abs. 3 lit. h DSGVO). Vor-Ort-Kontrollen sind mit angemessener Frist
        (in der Regel 14 Tage) anzukündigen und während der Geschäftszeiten ohne Störung des Betriebsablaufs durchzuführen. Der Nachweis kann auch durch aktuelle Testate, Berichte oder Zertifizierungen
        der eingesetzten Rechenzentrumsbetreiber erbracht werden.
      </p>

      <h2 id="p11">§ 11 Drittlandübermittlungen</h2>
      <p>
        Eine Übermittlung in Länder außerhalb des EWR erfolgt nur unter Einhaltung der Art. 44 ff. DSGVO, insbesondere auf Grundlage eines Angemessenheitsbeschlusses (EU-U.S. Data Privacy Framework) oder
        der EU-Standardvertragsklauseln (Durchführungsbeschluss (EU) 2021/914) einschließlich eines Transfer Impact Assessments und ergänzender Maßnahmen. Die Primärdatenbank befindet sich in der EU
        (Frankfurt am Main).
      </p>

      <h2 id="p12">§ 12 Löschung und Rückgabe</h2>
      <p>
        Nach Beendigung der Leistungen löscht der Auftragsverarbeiter nach Wahl des Verantwortlichen alle personenbezogenen Daten oder gibt sie zurück (Export), sofern keine Pflicht zur Speicherung nach
        Unionsrecht oder dem Recht der Mitgliedstaaten besteht (Art. 28 Abs. 3 lit. g DSGVO). Der Export steht 30 Tage nach Vertragsende zur Verfügung; danach werden die Daten gelöscht. In Backups
        enthaltene Daten werden im regulären Zyklus überschrieben. Die Löschung wird auf Verlangen bestätigt.
      </p>

      <h2 id="p13">§ 13 Haftung, Schlussbestimmungen</h2>
      <ol>
        <li>Für die Haftung gilt Art. 82 DSGVO. Im Übrigen gelten die Haftungsregelungen der AGB.</li>
        <li>Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform.</li>
        <li>Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam. Es gilt deutsches Recht.</li>
      </ol>

      <h2 id="a1">Anlage 1 – Technische und organisatorische Maßnahmen (Art. 32 DSGVO)</h2>
      <h3>1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)</h3>
      <ul>
        <li>
          <strong>Zutrittskontrolle:</strong> Betrieb ausschließlich in zertifizierten Rechenzentren der Unterauftragsverarbeiter (u. a. ISO 27001, SOC 2) mit Zugangskontrollen, Videoüberwachung und
          Sicherheitspersonal; keine eigenen Server-Räumlichkeiten.
        </li>
        <li>
          <strong>Zugangskontrolle:</strong> individuelle Benutzerkonten, Passwörter mit mindestens 12 Zeichen, sichere Passwort-Hashes (bcrypt), Ratenbegrenzung bei Anmeldung und Passwort-Reset,
          Zwei-Faktor-Authentifizierung für Plattform-Administratoren, Zwangsänderung vergebener Startpasswörter, Sitzungsbeendigung durch Administratoren, Sperrliste für missbräuchliche Absender.
        </li>
        <li>
          <strong>Zugriffskontrolle:</strong> rollenbasiertes Berechtigungskonzept (Inhaber, Admin, Mitarbeiter, Plattform-Admin), Row-Level-Security in der Datenbank zur Mandantentrennung, Prinzip der
          minimalen Rechte, Dienst-Schlüssel nur serverseitig, administrative Einsicht nur lesend und protokolliert.
        </li>
        <li>
          <strong>Trennungskontrolle:</strong> logische Trennung aller Daten nach Betrieb (Mandanten-ID) auf Datenbankebene; Trennung von Produktiv- und Entwicklungsumgebung; Demo-Konten mit
          Beispieldaten.
        </li>
        <li>
          <strong>Pseudonymisierung:</strong> IP-Adressen werden nur als HMAC-Hash gespeichert; Verwaltungslinks und Einladungen nur als Token-Hash; Anonymisierungsfunktion für Kundendaten.
        </li>
      </ul>
      <h3>2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)</h3>
      <ul>
        <li>
          <strong>Weitergabekontrolle:</strong> Transportverschlüsselung TLS 1.2+ mit HSTS, keine unverschlüsselte Übertragung, strikte Same-Origin-Prüfung von API-Anfragen, kein CORS-Zugriff fremder
          Websites, Content-Security-Policy, Prüfung hochgeladener Dateien anhand der Dateisignatur (nur PNG/JPEG/WebP, max. 2 MB).
        </li>
        <li>
          <strong>Eingabekontrolle:</strong> Protokollierung sicherheitsrelevanter Aktionen und administrativer Eingriffe in einem Audit-Log mit Zeitstempel und Benutzer; serverseitige Validierung und
          Bereinigung aller Eingaben.
        </li>
      </ul>
      <h3>3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b, c DSGVO)</h3>
      <ul>
        <li>Datensicherungen nach den Möglichkeiten des jeweiligen Tarifs des Datenbank-Anbieters bzw. eigene verschlüsselte Sicherungen, redundante Infrastruktur der Anbieter, Schutz vor DDoS-Angriffen auf Netzwerkebene, Ratenbegrenzung öffentlicher Schnittstellen.</li>
        <li>Rasche Wiederherstellbarkeit durch Datensicherungen, Datenbank-Migrationen unter Versionskontrolle und versionierte Bereitstellungen (Rollback).</li>
      </ul>
      <h3>4. Verfahren zur regelmäßigen Überprüfung (Art. 32 Abs. 1 lit. d DSGVO)</h3>
      <ul>
        <li>Automatisierte Tests der Datenbank-Sicherheitsregeln, Prüfung auf versehentlich veröffentlichte Geheimnisse vor jeder Veröffentlichung, Abhängigkeitsupdates, Sicherheitshinweise der Datenbank.</li>
        <li>Datenschutzfreundliche Voreinstellungen (Art. 25 DSGVO): keine Tracking-Cookies, keine Werbung, Datenminimierung, automatische nächtliche Löschung abgelaufener Daten nach festen Fristen.</li>
        <li>Incident-Response-Prozess mit Meldung an Verantwortliche innerhalb von 24 Stunden.</li>
      </ul>

      <h2 id="a2">Anlage 2 – Genehmigte Unterauftragsverarbeiter</h2>
      <table>
        <thead>
          <tr>
            <th>Unternehmen</th>
            <th>Leistung</th>
            <th>Standort der Verarbeitung</th>
            <th>Garantien</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc.</td>
            <td>Datenbank, Authentifizierung, Dateispeicher</td>
            <td>EU (Frankfurt am Main, AWS eu-central-1)</td>
            <td>AVV/DPA, EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>Hosting, Serverfunktionen, Auslieferung</td>
            <td>global (Edge), Funktionen EU/USA</td>
            <td>DPA, EU-U.S. DPF, EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Resend Inc.</td>
            <td>Versand transaktionaler E-Mails</td>
            <td>USA</td>
            <td>DPA, EU-U.S. DPF, EU-Standardvertragsklauseln</td>
          </tr>
          <tr>
            <td>Groq, Inc.</td>
            <td>Sprachmodell für optionale KI-Assistentin</td>
            <td>USA</td>
            <td>Customer Data Processing Addendum, EU-Standardvertragsklauseln; keine Nutzung zum Training</td>
          </tr>
        </tbody>
      </table>
    </LegalPage>
  );
}
