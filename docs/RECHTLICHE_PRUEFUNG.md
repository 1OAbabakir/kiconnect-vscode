# Risikoprüfung vor einer Marketplace-Veröffentlichung

Stand: 15. Oktober 2026. Gegenstand: lokal vorliegender Quellcode, Manifest,
README, Datenflussdokumentation und vorhandenes `kiconnect-vscode-0.0.1.vsix`.
Keine anwaltliche Rechtsfreigabe; nicht als anwaltlich privilegiert einzustufen.

## Ergebnis

Noch nicht zur Veröffentlichung empfohlen. Die Architektur zeigt keine eigene
Telemetrie oder Übermittlung an einen Server des Autors. Dennoch fehlen belastbare
Datenschutzhinweise für die Veröffentlichung und die Prüfung der für das konkrete
KI:connect-Konto geltenden Bedingungen. Das vorhandene VSIX ist veraltet.
Während der Prüfung wurde der Arbeitsstand extern weiter verändert; ein endgültiges
Release einschließlich neuer Assets muss deshalb separat geprüft werden.

Der Autor hat angegeben, das Projekt privat außerhalb dienstlicher Aufgaben
entwickelt zu haben. Unter dieser Annahme ist eine Arbeitgeberberechtigung nach
§ 69b UrhG nicht ersichtlich. Das bestätigt keine Rechte an etwaigen übernommenen
Quellen oder Assets.

## Risikoregister

Bewertung: Schwere (S) × Wahrscheinlichkeit (W), jeweils 1–5. Die Werte sind
qualitative Prioritäten für eine Veröffentlichung im jetzigen Zustand, keine
statistisch belegten Wahrscheinlichkeiten einer Rechtsverletzung.

| Thema | Befund | S × W | Maßnahme vor Veröffentlichung |
| --- | --- | --- | --- |
| Datenschutz/Marketplace | Chatverlauf, Code und Werkzeugergebnisse gehen an KI:connect. Die Datenflussbeschreibung ersetzt noch keine vollständige veröffentlichte Privacy Policy. | 4 × 3 = 12, ORANGE | Datenschutzhinweis mit Kontakt, Datenarten, Empfänger, lokaler Schlüsselablage und Rollenabgrenzung öffentlich verlinken. Eigene Verarbeitung, insbesondere Support, gesondert beschreiben. |
| Dienstbedingungen | API ist offiziell dokumentiert; kontospezifische Nutzungsbedingungen und Bedingungen der jeweiligen Modellanbieter sind nicht abschließend geprüft. | 3 × 3 = 9, GELB | Die tatsächlich im Konto geltenden Bedingungen prüfen; keine pauschale Freigabe für dienstliche oder personenbezogene Inhalte behaupten. |
| Veraltetes Paket | VSIX 0.0.1 enthält Copyright „Your Name“, Publisher-Platzhalter, alte Funktionen und keine aktuelle Datenflussdokumentation. | 3 × 4 = 12, ORANGE | Dieses Paket nicht hochladen. Neues Paket aus finalem Stand bauen und Inhalt prüfen. |
| Marke/Auftritt | README nennt das Projekt inoffiziell; Anzeigename lautet lediglich „KI:connect“. Herkunft und Rechte neuer Icons sind nicht abschließend geprüft. | 3 × 3 = 9, GELB | Marketplace-Titel und Beschreibung eindeutig als inoffiziellen Client kennzeichnen; nur eigene oder freigegebene Assets verwenden. |
| Quellcode/Lizenzen | Aktueller Quellstand enthält MIT-Lizenz mit Autorname und inzwischen `license: MIT`. Herkunft sämtlicher Beiträge ist nicht durch Codeprüfung belegbar. | 3 × 2 = 6, GELB | Rechte an übernommenem Code bestätigen; Lizenztexte aller tatsächlich mitgelieferten Drittbestandteile erhalten. |
| Publisher | `publisher` enthält weiterhin `your-publisher-id`. | Technischer Upload-Blocker | Tatsächliche eigene Publisher-ID eintragen und die beim Upload angebotene Vertragsfassung prüfen. |

## Festgestellte Schutzmaßnahmen und Grenzen

- Schlüssel werden über VS Code SecretStorage gespeichert, nicht in Einstellungen
  oder Projektdateien. Die Schlüsselprüfung sendet den Schlüssel bereits vor dem
  Speichern an KI:connect.
- HTTPS-Ziel ist `https://chat.kiconnect.nrw/api/v1`. Die Erweiterung überträgt den
  von VS Code gelieferten Verlauf einschließlich möglicher personenbezogener Daten.
- Keine eigene Telemetrie oder dauerhafte Gesprächsablage im geprüften Quellcode.
  Daraus folgt keine Aussage zu Serverprotokollen oder Speicherfristen des Dienstes.
- Werkzeugausführung erfolgt durch VS Code; Werkzeugausgaben werden in Folgeanfragen
  wieder an den Dienst gesendet.
- Aktuelles Manifest enthält keine Laufzeitabhängigkeiten; die neue Paketkonfiguration
  schließt `node_modules` aus. Das alte VSIX enthält dagegen Drittbibliotheken.
  Bei `data-uri-to-buffer` ist dort kein separater Lizenztext enthalten: dessen
  MIT-Lizenzpflichten wären bei weiterer Auslieferung gesondert zu prüfen.

Microsofts öffentlich abrufbare Publisher-Vertragsfassung verlangt in Abschnitt
8(b)(ii) eine Privacy Policy auch bei Übermittlung personenbezogener Daten an Dritte.
Das gilt als Plattformanforderung unabhängig davon, ob der Autor selbst Chatdaten
erhält. Welche DSGVO-Rolle der Autor übernimmt, lässt sich daraus nicht pauschal
ableiten; eine Einwilligungsabfrage ist ebenfalls keine automatische Lösung.

Die in der offiziellen KI:connect-Hilfe verlinkten Datenschutz- und
Nutzungsbedingungsseiten lieferten beim Abruf 404. Öffentliche Musterdokumente sind
kein Nachweis der Bedingungen des konkreten Kontos. Die abrufbare Microsoft-PDF
trägt eine ältere Versionskennung; maßgeblich bleibt die beim Upload geltende Fassung.

Eine mögliche Impressumspflicht hängt vom tatsächlichen Angebot und dessen
geschäftsmäßigem Charakter ab (§ 5 DDG). „Privat entwickelt“ beantwortet diese Frage
nicht allein. Bei wirtschaftlicher Nutzung oder unklaren Datenschutzrollen sollte
dieser Teil vor Veröffentlichung juristisch geprüft werden.

## Quellen

- [Microsoft Publisher Agreement, Abschnitte 4(b), 8(b)](https://cdn.vsassets.io/v/M187_20210610.3/_content/Visual-Studio-Marketplace-Publisher-Agreement.pdf)
- [VS Code: Veröffentlichung](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [KI:connect: API-Zugriff](https://help.itc.rwth-aachen.de/service/1808737e10424937b76e564ed15d8028/article/4f07ebbbc8c4477a8db9baa441494941/)
- [KI:connect: Hilfe und Verweise auf Bedingungen](https://kiconnect.pages.rwth-aachen.de/pages/ui-helpfrontend/)
- [KI:connect: Dokumentenpaket und dessen Grenzen](https://kiconnect.pages.rwth-aachen.de/pages/documentation/)
- [§ 69b UrhG](https://www.gesetze-im-internet.de/urhg/__69b.html)
- [§ 23 MarkenG: zulässige Bezugnahme unter Voraussetzungen](https://www.gesetze-im-internet.de/markeng/__23.html)
- [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
- [BfDI: DSGVO und BDSG, insbesondere Art. 12–14](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Broschueren/INFO1.pdf?__blob=publicationFile&v=27)
