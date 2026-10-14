# Installation und erster Start

## Voraussetzungen

- Visual Studio Code ab Version 1.104 mit nutzbarem integriertem Chat.
- Ein persönlicher API-Schlüssel für KI:connect und Zugriff auf mindestens ein Chatmodell.
- Für die Entwicklung: Node.js ab Version 22 und npm. Die Tests benötigen weder Schlüssel noch Netzwerkzugriff.

## Aktuellen Quellstand starten

1. In VS Code den Projektordner öffnen, der `package.json`, `src` und `.vscode` enthält.
2. Im integrierten Terminal die Abhängigkeiten installieren und das Projekt kompilieren:

   ```bash
   npm ci --ignore-scripts
   npm run compile
   ```

3. **Ausführen und Debuggen** mit `Strg+Umschalt+D` öffnen.
4. Oben **KI:connect-Erweiterung starten** auswählen und `F5` drücken.
5. Im neuen Fenster, dem Erweiterungsentwicklungsfenster, weiterarbeiten. Dort ist die Erweiterung aktiv.

Die zusätzliche Browserkonfiguration ist für diese Erweiterung nicht erforderlich.

## Schlüssel hinterlegen

Im Entwicklungsfenster `Strg+Umschalt+P` drücken und **KI:connect: API-Schlüssel hinterlegen** auswählen. Den persönlichen Schlüssel ohne zusätzliche Anführungszeichen eingeben.

Die Erweiterung fragt vor dem Speichern die Modellliste ab. Nach spätestens 15 Sekunden wird die Prüfung abgebrochen, wenn keine Antwort vorliegt. Bei einem Fehler oder einer leeren Chatmodellliste bleibt ein zuvor gespeicherter Schlüssel erhalten.

Ein erfolgreicher Test bestätigt den Zugriff auf die Modellliste. Einzelne Modelle können trotzdem zusätzliche Berechtigungen erfordern. Ein in Zed gespeicherter Schlüssel wird nicht automatisch übernommen.

## Modell im Chat auswählen

Im integrierten Chat die Modellauswahl neben dem Eingabefeld öffnen. Modelle erscheinen mit dem Präfix **KI:connect:**.

- **Agent**: Modelle mit Werkzeugunterstützung. VS Code kann deren Werkzeugaufrufe verarbeiten.
- **Ask**: Textchat, auch für Modelle ohne Werkzeugunterstützung.

Falls nötig, unter **Manage Models** die Sichtbarkeit des Modells einschalten. Die Namen dieser eingebauten VS-Code-Ansichten hängen von der installierten Oberflächensprache ab.

**KI:connect: Chat öffnen** bietet optional eine eigene Modellauswahl und öffnet Ask mit dem gewählten Modell. Die programmatische Vorauswahl hängt von der Unterstützung des eingebauten Chat-Befehls in der jeweiligen VS-Code-Version ab.

## Nach Änderungen

Nach Änderungen am TypeScript-Code `npm run compile` ausführen. Im Entwicklungsfenster anschließend den VS-Code-Befehl **Developer: Reload Window** beziehungsweise **Entwickler: Fenster neu laden** ausführen.

## Installierbares Paket

Das aktuelle lokale Vorschaupaket wird mit `npm run package` unter `dist/kiconnect-vscode-0.1.0.vsix` erstellt. Es kann in VS Code über **Erweiterungen → … → Aus VSIX installieren…** installiert werden. Solange die persönliche Marketplace-Publisher-ID offen ist, dient es nur zur lokalen Erprobung.

Eine eventuell lokal noch vorhandene Datei `kiconnect-vscode-0.0.1.vsix` stammt aus dem alten Stand und enthält die aktuellen Änderungen nicht. Sie wird nicht mehr im Repository ausgeliefert.

Wie ein neues Paket geprüft und erstellt wird, beschreibt [Veröffentlichung](VEROEFFENTLICHUNG.md).
