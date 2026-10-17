# Veröffentlichung und persönliche Vorstellung

## Positionierung

**KI:connect** bringt verfügbare KI:connect-Modelle in den integrierten Chat von Visual Studio Code. Der praktische Nutzen liegt darin, Modellwahl, Gespräch und geeignete Werkzeugaufrufe in der bestehenden Entwicklungsumgebung zu verbinden.

Autor ist **Omed Ababakir**. Seine Tätigkeit bei der Stadt Dortmund beschreibt den beruflichen Hintergrund. Das Projekt wird als eigenständige, inoffizielle Entwicklung vorgestellt und verwendet keine städtischen Logos oder Freigabeversprechen.

## Kurzbeschreibung für ein Portfolio

> Ich habe eine VS-Code-Erweiterung für KI:connect entwickelt. Sie verbindet die normale Modellauswahl mit gestreamten Antworten und OpenAI-kompatiblen Werkzeugaufrufen. Mein Schwerpunkt liegt auf einer verständlichen Bedienung, nachvollziehbaren Datenwegen und automatisierten Tests für Gesprächsverlauf, Streaming und Abbrüche.

Die Beschreibung benennt konkrete implementierte Funktionen. Aussagen zu Zeitersparnis, Nutzerzahlen oder organisatorischer Einführung erst ergänzen, wenn dafür belastbare Ergebnisse vorliegen.

## Vorschlag für eine Projektvorstellung

> KI:connect direkt im Editor: Mit meiner Erweiterung lassen sich verfügbare Modelle im VS-Code-Chat auswählen und geeignete Modelle mit den Werkzeugen des Agent-Modus verwenden. Das Projekt ist dokumentiert und enthält automatisierte Tests für die technische Anbindung. Ich freue mich über Rückmeldungen zur Bedienung und zu weiteren Modellbereitstellungen.
>
> Omed Ababakir

Projektlink: [GitHub-Repository](https://github.com/1OAbabakir/kiconnect-vscode).

## Marketplace vorbereiten

Für eine Veröffentlichung ist ein persönlicher Publisher im Visual Studio Marketplace erforderlich. Ein Anzeigename und eine Publisher-ID sind unterschiedliche Angaben: Der Anzeigename dieser Erweiterung ist **KI:connect**; die tatsächliche Publisher-ID muss zum angemeldeten Herausgeberkonto gehören.

Der technische Paketname bleibt `kiconnect-vscode`. Die vollständige Erweiterungskennung besteht aus `publisher.name`. Deshalb die Publisher-ID vor der ersten öffentlichen Veröffentlichung festlegen und danach nicht beiläufig ändern.

Offen ist die Erstellung und Bestätigung des persönlichen Publishers. Die vorgesehene ID `omed-ababakir` muss im eigenen Herausgeberkonto angelegt oder bestätigt werden. Der Paketstand wird erst nach Abgleich mit der tatsächlichen Publisher-ID veröffentlicht.

## Herausgeberkonto anlegen

1. Die [Marketplace-Verwaltung](https://marketplace.visualstudio.com/manage) öffnen und mit dem gewünschten Microsoft-Konto anmelden.
2. Einen neuen persönlichen Publisher erstellen. Als Anzeigename eignet sich **Omed Ababakir**; die eindeutige Publisher-ID wird im Portal festgelegt.
3. Die angezeigte Publisher-ID in `package.json` unter `publisher` übernehmen.
4. Paket und Prüfungen erneut ausführen; anschließend das VSIX im Herausgeberportal hochladen.

Die Anmeldung erfolgt direkt bei Microsoft. Kennwörter oder Zugangstoken gehören weder in das Repository noch in einen Chat.

## Paket prüfen und erstellen

Die [offizielle Veröffentlichungsanleitung](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) beschreibt Paketierung und manuellen Upload mit `vsce`.

Vor dem Upload müssen Manifest, README, Lizenz, Versionsnummer und Paketinhalt zusammenpassen. Die Entwicklungskonfiguration, Abhängigkeiten für Tests und alte VSIX-Dateien sollen nicht Teil des Installationspakets sein.

Eine Veröffentlichung erfolgt erst nach Tests, Paketprüfung und abschließender Überprüfung des fertigen Stands. Das Erstellen eines VSIX ist noch keine Veröffentlichung im Marketplace.


## Rechtliche Bestandsaufnahme

Die ergänzte [Risikoprüfung](RECHTLICHE_PRUEFUNG.md) ist eine Bestandsaufnahme mit offenem Rechtsprüfbedarf. Ihr Befund zum alten VSIX bezieht sich auf 0.0.1, nicht auf das neu gebaute Vorschaupaket. Öffentliche [Datenschutzhinweise](DATENSCHUTZHINWEISE.md), die technische [Datenflussbeschreibung](DATENFLUSS.md) und die [Herkunft des Symbols](../assets/README.md) liegen inzwischen vor. Ob diese Angaben für die konkrete Veröffentlichung vollständig sind und welche Dienstbedingungen gelten, muss vor dem öffentlichen Upload geklärt werden. Eine technische Prüfung bestätigt keine Rechtsfreigabe.

## Paketbefehle und aktueller Freigabestand

```bash
npm ci --ignore-scripts
npm test
npm run package
```

Das Ergebnis liegt unter `dist/kiconnect-vscode-1.0.0.vsix`. `npm run package` verwendet die im Projekt festgelegte Version von `@vscode/vsce`. Das Paket enthält die Herausgeberkennung `omed-ababakir`. Für den Marketplace-Upload muss dieselbe Kennung im eigenen Publisher-Konto verwendet werden.

Die API-Typen sind auf die unterstützte VS-Code-Mindestversion 1.104.0 festgelegt. Die Entwicklungswerkzeuge benötigen Node.js ab Version 22. Entwicklungsdateien, Quellkarten und Abhängigkeiten sind über `.vscodeignore` vom VSIX ausgeschlossen.

Das VSIX im Marketplace unter dem passenden Publisher über „New extension → Visual Studio Code“ hochladen. Falls die eigene Publisher-ID abweicht, diese im Manifest ändern und das Paket neu bauen. Der GitHub-Prüfworkflow baut nur ein Paket und führt keine automatische Veröffentlichung aus.
