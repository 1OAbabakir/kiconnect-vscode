# Fehlerbehebung

## Die Befehle fehlen

Die Erweiterung muss im aktuellen Fenster geladen sein. Beim Entwickeln wird sie im separaten Erweiterungsentwicklungsfenster gestartet, nicht automatisch im ursprünglichen Projektfenster.

`npm run compile` ausführen und die Startkonfiguration **KI:connect-Erweiterung starten** mit `F5` öffnen. Nach Änderungen das Entwicklungsfenster neu laden. Ein altes VSIX-Paket enthält neu hinzugefügte Befehle nicht.

## Der Schlüssel wird abgelehnt

**KI:connect: API-Schlüssel hinterlegen** prüft den Zugriff auf die Modellliste, bevor der Schlüssel gespeichert wird. Die Fehlermeldung nennt einen HTTP-Status, einen Verbindungsfehler oder eine leere Modellliste.

| Rückmeldung | Nächster Prüfschritt |
| --- | --- |
| HTTP 401 oder 403 | Gültigkeit des Schlüssels und die Modellfreigaben im KI:connect-Konto prüfen. |
| Keine Chatmodelle | Prüfen, ob der Schlüssel für Chatmodelle freigeschaltet ist; Einbettungs- und Rerankingmodelle werden ausgefiltert. |
| Zeitüberschreitung oder Verbindungsfehler | Netzwerk, Erreichbarkeit des Dienstes und gegebenenfalls Proxy-Einstellungen prüfen. |
| Modellliste geladen, Chat scheitert | Berechtigung und Verfügbarkeit des konkret gewählten Modells prüfen. |

Ein vorher gespeicherter Schlüssel bleibt bei einer fehlgeschlagenen Prüfung erhalten. Schlüssel niemals in einen öffentlichen Fehlerbericht kopieren.

## Modelle stehen in der Übersicht, fehlen aber neben dem Chat

Zuerst den Modus prüfen: Im **Agent-Modus** zeigt VS Code geeignete Modelle mit Werkzeugunterstützung. Reine Textmodelle im **Ask-Modus** auswählen. Unter **Manage Models** außerdem die Sichtbarkeit prüfen.

Die Fähigkeitserkennung bevorzugt API-Metadaten. Ohne solche Angaben werden nur bekannte Familien automatisch als toolfähig erkannt. Ein nicht erkanntes Modell ist deshalb nicht automatisch technisch ungeeignet. Einen Fehlerbericht mit Modellname und beobachtetem Verhalten erstellen, damit die Zuordnung geprüft werden kann.

## „Language model unavailable“ erscheint

Diese VS-Code-Meldung kann auftreten, wenn für die Anfrage kein verwendbares Modell ausgewählt ist. Ein Modell direkt am Chat-Eingabefeld auswählen. Die Meldung allein beweist nicht, dass der API-Schlüssel ungültig ist.

## Werkzeugaufrufe schlagen fehl

Die Modellfähigkeit und die konkrete Serverbereitstellung müssen OpenAI-kompatible Werkzeugaufrufe unterstützen. Die Erweiterung weist unbekannte Werkzeugnamen, unvollständige Aufrufe und ungültige JSON-Argumente zurück. Bei abgeschnittenen Antworten kann auch die vom Dienst gesetzte Ausgabegrenze eine Rolle spielen.

Ein Vergleich im Ask-Modus kann helfen, reinen Modellzugriff und Werkzeugverarbeitung auseinanderzuhalten. Modellname, Fehlermeldung und VS-Code-Version im Fehlerbericht nennen.

## Lange Gespräche oder große Projekte scheitern

Die Erweiterung meldet derzeit feste Modellbudgets und schätzt Tokens anhand der UTF-8-Bytes. Ein neues Gespräch mit weniger Kontext beginnen. Die Vorgaben sind keine Ermittlung der tatsächlichen Modellgrenzen; Details stehen in der [Architektur](ARCHITEKTUR.md).
