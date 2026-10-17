# KI:connect

**KI:connect dort nutzen, wo Code entsteht.**

Ich habe diese Erweiterung entwickelt, um KI:connect direkt im integrierten Chat von Visual Studio Code zu nutzen. Du wählst dein Modell direkt am Chat-Eingabefeld, erhältst Antworten während der Generierung und kannst geeignete Modelle im Agent-Modus mit den von VS Code bereitgestellten Werkzeugen nutzen.

Ich bin **Omed Ababakir** und entwickle KI:connect für VS Code als eigenständiges, inoffizielles Projekt. Es ist keine offizielle Veröffentlichung der Stadt Dortmund oder von KI:connect.

## Was die Erweiterung kann

- Verfügbare Chatmodelle über deinen persönlichen KI:connect-API-Schlüssel laden.
- Den Schlüssel vor dem Speichern anhand der Modellabfrage prüfen und in VS Code SecretStorage hinterlegen.
- Antworten fortlaufend anzeigen und den von VS Code übergebenen Gesprächsverlauf berücksichtigen.
- Werkzeugdefinitionen an geeignete Modelle übermitteln und deren Aufrufe an VS Code zurückgeben.
- Laufende HTTP-Anfragen beim Abbrechen einer Antwort beenden.

Die Werkzeugausführung und zugehörige Bestätigungen übernimmt VS Code. Bilder und Werkzeugergebnisse mit Bildinhalten werden derzeit nicht unterstützt.

## In wenigen Schritten starten

Vorausgesetzt werden **VS Code ab 1.104**, ein nutzbarer integrierter Chat und ein persönlicher KI:connect-API-Schlüssel mit Modellzugriff.

1. Die Erweiterung aus dem aktuellen Quellstand starten: [Installation und erster Start](docs/INSTALLATION.md).
2. Mit `Strg+Umschalt+P` die Befehlspalette öffnen und **KI:connect: API-Schlüssel hinterlegen** ausführen.
3. Den Schlüssel eingeben. Die Rückmeldung nennt die Anzahl der gefundenen Chatmodelle oder den aufgetretenen Fehler.
4. Den Chat öffnen und **unten neben dem Eingabefeld** ein KI:connect-Modell auswählen. Modelle mit Werkzeugunterstützung sind im **Agent-Modus** verfügbar; reine Textmodelle im **Ask-Modus**.
5. Eine Nachricht senden. Falls ein Modell fehlt, in der Modellauswahl **Manage Models** beziehungsweise die entsprechende deutschsprachige Ansicht öffnen und seine Sichtbarkeit prüfen.

Der Befehl **KI:connect: Chat öffnen** ist eine zusätzliche Einstiegsmöglichkeit. Die normale Modellauswahl bleibt der vorgesehene Weg.

## Befehle

| Befehl | Wirkung |
| --- | --- |
| **KI:connect: API-Schlüssel hinterlegen** | Modellzugriff prüfen und den Schlüssel speichern. |
| **KI:connect: API-Schlüssel entfernen** | Den gespeicherten Schlüssel entfernen und die Modellliste aktualisieren. |
| **KI:connect: Chat öffnen** | Ein Modell auswählen und den Chat im Ask-Modus öffnen. |

## Projektstand und Grenzen

Die Modellauswahl wurde im Entwicklungsfenster praktisch erprobt. Automatisierte Tests prüfen Modellabfrage, Schlüsselprüfung, Streaming, Gesprächsverlauf, Werkzeugaufrufe und Abbrüche mit simulierten Antworten. Die tatsächliche Werkzeugunterstützung hängt zusätzlich vom jeweiligen KI:connect-Modell und dessen Serverkonfiguration ab.

Fähigkeiten werden bevorzugt aus API-Metadaten gelesen. Ohne diese Angaben erkennt die Erweiterung GPT-OSS, Qwen 3 und Mistral Small 3/4 anhand ihrer Namen als toolfähige Familien. Das sind Kompatibilitätsannahmen; unbekannte Modelle bleiben zunächst Textmodelle. Eine explizite negative API-Angabe hat Vorrang.

Das aktuelle Installationspaket ist eine Entwicklungsvorschau, solange mein Marketplace-Publisher-Konto noch nicht bestätigt ist.

Die Tokenzählung ist eine zurückhaltende UTF-8-Byte-Schätzung. Als Modellbudgets werden 8.192 Eingabe- und 2.048 Ausgabetokens an VS Code gemeldet; dies sind Vorgaben der Erweiterung und keine Messung der tatsächlichen Modellgrenzen.

## Dokumentation

| Thema | Inhalt |
| --- | --- |
| [Installation](docs/INSTALLATION.md) | Voraussetzungen, Entwicklungsfenster und tägliche Nutzung. |
| [Architektur](docs/ARCHITEKTUR.md) | Module, Datenfluss und Werkzeugprotokoll. |
| [Entwicklung](docs/ENTWICKLUNG.md) | Projektstruktur, Sprachkonventionen und Prüfungen. |
| [Datenschutzhinweise](docs/DATENSCHUTZHINWEISE.md) | Informationen zur Nutzung und zum Projektkontakt. |
| [Datenfluss](docs/DATENFLUSS.md) | Übertragene Inhalte, Schlüsselablage und Zuständigkeiten. |
| [Fehlerbehebung](docs/FEHLERBEHEBUNG.md) | Konkrete Symptome und passende Prüfschritte. |
| [Technischer Prüfstand](docs/PRUEFBERICHT.md) | Durchgeführte Prüfungen und noch offene Freigabeschritte. |
| [Veröffentlichung und Vorstellung](docs/VEROEFFENTLICHUNG.md) | Herausgeberangaben, Paketprüfung und Texte zur persönlichen Präsentation. |

## Entwicklung

```bash
npm ci --ignore-scripts
npm run compile
npm test
```

Im Bereich **Ausführen und Debuggen** die Konfiguration **KI:connect-Erweiterung starten** auswählen und `F5` drücken.

## Autor und Mitwirkung

Ich entwickle dieses Projekt und arbeite bei der Stadt Dortmund. Mit dieser Berufsangabe beschreibe ich meinen Hintergrund; das Projekt entsteht ohne Auftrag oder Freigabe durch die Stadt.

Ich freue mich über Fehlerberichte und Verbesserungsvorschläge über die [GitHub-Issues](https://github.com/1OAbabakir/kiconnect-vscode/issues). Bitte gib eine kurze Beschreibung, Reproduktionsschritte und die verwendete VS-Code-Version an. API-Schlüssel und vertrauliche Gesprächsinhalte gehören nicht in einen Fehlerbericht.

## Lizenz und Quellen

Ein eigener GitHub-Workflow führt Tests und Paketierung bei Änderungen auf `main` und bei Pull Requests aus. Er veröffentlicht nichts im Marketplace.

Das Projekt steht unter der [MIT-Lizenz](LICENSE). Der maßgebliche Lizenztext bleibt im englischen Original.

- [VS Code: Language Model Chat Provider API](https://code.visualstudio.com/api/extension-guides/ai/language-model-chat-provider)
- [KI:connect: Bedienung und API-Hilfe](https://kiconnect.pages.rwth-aachen.de/pages/ui-helpfrontend/)
