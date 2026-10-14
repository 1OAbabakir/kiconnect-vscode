# Entwicklung und Qualitätsprüfung

## Lokaler Ablauf

```bash
npm ci --ignore-scripts
npm run compile
npm test
```

`npm test` kompiliert über das `pretest`-Skript automatisch vor dem Testlauf. `npm run watch` übersetzt Änderungen während der Entwicklung fortlaufend.

Die Startkonfiguration **KI:connect-Erweiterung starten** öffnet einen separaten VS-Code-Erweiterungshost. Sie verwendet die kompilierten Dateien unter `out`.

## Sprachkonventionen

- Dokumentation, eigene Bedienungstexte, Kommentare und Testbeschreibungen sind Deutsch.
- Technische Bezeichner für Klassen, Funktionen und Variablen bleiben Englisch.
- VS-Code-Schnittstellen, API-Felder und Protokollwerte behalten ihre vorgeschriebenen Namen.
- Modellnamen werden vom Anbieter übernommen.
- Der MIT-Lizenztext bleibt im englischen Original.

Befehlskennungen wie `kiconnect.setApiKey` bleiben stabil, auch wenn sich der sichtbare deutsche Titel ändert. Dadurch funktionieren bestehende Tastenkürzel und die Provider-Verwaltung weiter.

## Tests

Die Tests verwenden den Node.js-Testläufer, simulierte HTTP-Antworten und eine kleine Ersatzimplementierung der benötigten VS-Code-Typen. Sie rufen den produktiven Provider und API-Client auf.

Geprüft werden insbesondere:

- Modellinformationen und Zuordnung der Werkzeugfähigkeiten.
- Schlüsselprüfung bei gültigem Zugriff, HTTP-Fehlern und leeren Modelllisten.
- Gestreamte Texte über Paketgrenzen hinweg.
- Übertragung des Gesprächsverlaufs und der Werkzeugdefinitionen.
- Zusammensetzen paralleler Werkzeugaufrufe und Übernahme ihrer Ergebnisse.
- Fehlerhafte oder abgeschnittene Argumente und unbekannte Werkzeuge.
- Abbruch einer HTTP-Anfrage während Text- oder Werkzeugverarbeitung.

Diese Tests ersetzen keinen Test der VS-Code-Oberfläche oder des echten KI:connect-Endpunkts.

## Prüfung im Entwicklungsfenster

Vor einer Veröffentlichung mit einem dafür geeigneten persönlichen Schlüssel prüfen:

1. Schlüssel hinterlegen, Modellliste laden und eine verständliche Rückmeldung erhalten.
2. Ein Textmodell im Ask-Modus auswählen und eine Folgefrage zum bisherigen Verlauf stellen.
3. Ein toolfähiges Modell über die normale Auswahl im Agent-Modus verwenden.
4. In einem Testordner eine unkritische Werkzeugaufgabe ausführen lassen und deren Ergebnis im Chat prüfen.
5. Eine laufende Antwort abbrechen und den Chat anschließend weiterverwenden.
6. Schlüssel entfernen und kontrollieren, dass keine nutzbaren Modelle für diesen Zugang verbleiben.

Das Ergebnis mit VS-Code-Version und getesteten Modellnamen dokumentieren. Schlüssel oder vertrauliche Inhalte nicht in Testprotokolle übernehmen.

## Quellcode und erzeugte Dateien

Änderungen werden unter `src` vorgenommen. Der Compiler erzeugt JavaScript und Quellkarten unter `out`; diese Dateien werden in diesem Repository ebenfalls versioniert. Nach Änderungen am Quellcode vor der Weitergabe neu kompilieren.
