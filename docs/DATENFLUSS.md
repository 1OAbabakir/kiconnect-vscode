# Datenfluss und Schlüsselverwaltung

Diese Beschreibung dokumentiert das Verhalten der Erweiterung. Sie bewertet nicht die Verarbeitung beim Betreiber von KI:connect oder bei den eingesetzten Modellanbietern.

## Welche Daten wohin gelangen

| Vorgang | Ziel | Übertragene Angaben |
| --- | --- | --- |
| Schlüssel prüfen und Modelle laden | `https://chat.kiconnect.nrw/api/v1/models` | API-Schlüssel im HTTP-Header `Authorization`. |
| Chatnachricht senden | `https://chat.kiconnect.nrw/api/v1/chat/completions` | Schlüssel, Modellkennung und der von VS Code übergebene Verlauf. |
| Werkzeuge anbieten | Derselbe Chat-Endpunkt | Namen, Beschreibungen und Eingabeschemata der verfügbaren Werkzeuge. |
| Gespräch nach einem Werkzeugaufruf fortsetzen | Derselbe Chat-Endpunkt | Aufrufkennungen, Argumente und die von VS Code übergebenen Werkzeugergebnisse. |

Zum Verlauf können Code, Dateiausschnitte oder Werkzeugausgaben gehören, wenn VS Code sie in die Anfrage aufnimmt. Die Erweiterung überträgt die vom Chat bereitgestellten Inhalte. Sie liest nicht selbständig das gesamte Projekt ein.

## Speicherung des Schlüssels

Der persönliche Schlüssel wird über die VS-Code-Schnittstelle `SecretStorage` unter `kiconnect.apiKey` verwaltet. Die Erweiterung schreibt ihn nicht in Projektdateien, Einstellungen oder eigene Protokolle. Die konkrete geschützte Ablage hängt von VS Code und dem Betriebssystem ab.

Beim Hinterlegen wird zuerst die Modellliste abgefragt. Ist sie leer oder schlägt die Prüfung fehl, wird ein bisheriger Schlüssel nicht überschrieben. Mit **KI:connect: API-Schlüssel entfernen** wird der Eintrag aus SecretStorage gelöscht.

## Werkzeugausführung

Die Erweiterung übersetzt Werkzeugaufrufe und Ergebnisse zwischen VS Code und KI:connect. VS Code ist für Werkzeugausführung und die jeweils vorgesehenen Bestätigungen zuständig. Welche Inhalte einzelne Werkzeuge lesen oder verändern, hängt von deren Implementierung und den Einstellungen des Chats ab.

## Protokolle und Telemetrie

Der Quellcode enthält keine eigene Telemetrie und keinen eigenen dauerhaften Gesprächsspeicher. VS Code, andere Erweiterungen und der KI:connect-Dienst können unabhängig davon Daten verarbeiten oder protokollieren. HTTP-Fehler zeigen einen Statuscode; ungeprüfte Serverantworten werden nicht in die eigene Fehlermeldung übernommen.

Bei Fehlerberichten nur die notwendigen Angaben weitergeben. Insbesondere API-Schlüssel, vertrauliche Dateiinhalte und vollständige Gesprächsprotokolle vor dem Teilen entfernen.

## Einsatz im beruflichen Umfeld

Ob konkrete dienstliche Inhalte über KI:connect verarbeitet werden dürfen, ergibt sich nicht aus der Installation dieser Erweiterung. Maßgeblich sind die für die jeweilige Organisation geltenden Vorgaben und die dort freigegebenen Dienste. Das Projekt behauptet keine offizielle Freigabe oder Zertifizierung für die Stadt Dortmund.
