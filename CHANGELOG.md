## 1.0.0

- Integrierter VS-Code-Chat mit KI:connect-Modellwahl und gestreamten Antworten.
- Interaktive Ersteinrichtung mit sicherer Schlüsselprüfung und Speicherung.
- Letzte Modellauswahl nach dem Neuladen wiederherstellen.
- Lokale o200k-BPE-Tokenzählung statt UTF-8-Byte-Zählung; Referenzzählung mit Reserve für andere Modellfamilien.
- Standard-Kontextbudget auf 131.072 Tokens erhöht (122.880 Eingabe, 8.192 Antwort). API-Grenzen haben Vorrang.
- Änderungen an Kontextbudgets aktualisieren die Modellinformationen.
- Werkzeugunterstützung für geeignete Modelle im Agent-Modus.

## 0.3.0

- Integrierten VS-Code-Chat wieder zum einzigen Chat-Einstieg gemacht.
- Eigene Chat-Seitenleiste samt Oberflächendateien und Tests entfernt.
- Modellwahl und Chat-Start in `src/chat.ts` gebündelt.
- Letzte Modellauswahl wird gemerkt und nach dem Neuladen wieder geöffnet.
- Einrichtungstutorial und einstellbare Kontextbudgets bleiben erhalten.

## 0.2.0

- Eigener KI:connect-Textchat in der Seitenleiste, ohne Copilot-Anmeldung.
- Seitenleiste wird beim Start und Neuladen automatisch geöffnet.
- Interaktive Einrichtung mit sicherer Schlüsselprüfung, Modellwahl und Einstieg in den eigenen Chat.
- Streaming, Abbrechen, Codeblöcke und neuer Gesprächsverlauf.
- Modellbudgets aus API-Metadaten; einstellbare Vorgaben bei fehlenden Serverangaben.
- Bisheriger VS-Code-Chat als separat benannte Option weiterhin verfügbar.

# Änderungsübersicht

## 0.1.0 – Veröffentlichung vorbereitet

- KI:connect-Modelle im integrierten VS-Code-Chat auswählen.
- API-Schlüssel vor der Ablage prüfen und über VS Code SecretStorage verwalten.
- Gestreamte Antworten und den von VS Code übergebenen Verlauf übertragen.
- OpenAI-kompatible Werkzeugaufrufe für geeignete Modelle verarbeiten.
- Werkzeugfähigkeiten anhand von Metadaten und bekannten Modellfamilien zuordnen.
- Abbrüche an laufende HTTP-Anfragen weiterreichen.
- Eigene Bedienungstexte, Kommentare und Dokumentation auf Deutsch bereitstellen.
- Automatisierte Tests für Schlüsselprüfung, Modellliste, Nachrichten, Werkzeuge und Abbrüche ergänzen.

Diese Version ist für die Erstveröffentlichung vorbereitet. Dieser Eintrag bestätigt noch keine Veröffentlichung im Marketplace.

## 0.0.1 – Ursprünglicher Stand

- Erstes Grundgerüst für die Anbindung von KI:connect an VS Code.
