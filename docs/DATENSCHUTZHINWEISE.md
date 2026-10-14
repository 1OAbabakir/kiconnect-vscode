# Datenschutzhinweise zu KI:connect

Stand: 15. Oktober 2026. Diese Hinweise beschreiben die Erweiterung von Omed Ababakir. Sie ersetzen nicht die Datenschutzinformationen von VS Code, GitHub oder dem jeweiligen KI:connect-Betreiber.

## Projekt und Kontakt

Autor und Ansprechpartner für dieses Projekt ist **Omed Ababakir**. Das Projekt ist eine eigenständige, inoffizielle Entwicklung. Kontakt zum Projekt ist über das [GitHub-Profil](https://github.com/1OAbabakir) möglich; technische Fehler können über die [Projekt-Issues](https://github.com/1OAbabakir/kiconnect-vscode/issues) gemeldet werden.

## Daten bei der Nutzung der Erweiterung

Die Erweiterung sendet Anfragen unmittelbar aus VS Code an `https://chat.kiconnect.nrw/api/v1`. Der Autor betreibt für diese Erweiterung keinen zwischengeschalteten Server.

- **Modellabfrage und Schlüsselprüfung:** Der persönliche API-Schlüssel wird als Bearer-Zugangsdaten über HTTPS an KI:connect übertragen. Dies geschieht bei der Prüfung bereits vor dem lokalen Speichern.
- **Chat:** Übertragen werden die gewählte Modellkennung und die von VS Code bereitgestellten Nachrichten. Dazu können Nutzereingaben, Code und Kontext aus Dateien gehören.
- **Werkzeuge:** Bei geeigneten Modellen werden Werkzeugnamen, Beschreibungen und Eingabeschemata übermittelt. Nach einer Werkzeugausführung können Argumente und Ergebnisse Bestandteil der nächsten Anfrage sein. Diese können Dateiinhalte oder andere personenbezogene beziehungsweise vertrauliche Angaben enthalten.

Welche Angaben KI:connect und die dort angebundenen Modellanbieter weiterverarbeiten oder speichern, ergibt sich aus den für deinen Zugang geltenden Dienstinformationen. Diese Erweiterung legt dafür keine eigenen serverseitigen Speicherfristen fest.

## Lokale Speicherung und Entfernen des Schlüssels

Der API-Schlüssel wird über VS Code SecretStorage unter `kiconnect.apiKey` verwaltet. Die konkrete geschützte Ablage übernimmt VS Code zusammen mit dem Betriebssystem. Der Schlüssel wird von der Erweiterung nicht in Projektdateien oder normale Einstellungen geschrieben.

Mit **KI:connect: API-Schlüssel entfernen** wird der von der Erweiterung verwaltete SecretStorage-Eintrag gelöscht. Dadurch werden keine bereits an den Dienst übertragenen Inhalte und keine unabhängig von VS Code gespeicherten Chatverläufe gelöscht.

Die Erweiterung enthält keine eigene Telemetrie und legt keinen eigenen dauerhaften Gesprächsspeicher an. Sie erhält dadurch keine Kontrolle über die Protokollierung oder Speicherung durch VS Code, andere Erweiterungen oder den Dienst.

## Support und GitHub

Wer ein GitHub-Issue erstellt, veröffentlicht die dort eingetragenen Angaben im Projekt. Für die Bearbeitung können die veröffentlichten Informationen vom Autor gelesen und beantwortet werden. Nur Angaben übermitteln, die für die Fehleranalyse erforderlich sind. API-Schlüssel und vertrauliche Gesprächsinhalte gehören nicht in Issues.

Für Konten, Plattformprotokolle und die Nutzung von GitHub gelten dessen [Datenschutzhinweise](https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement). Eine Issue-Schließung entfernt seinen Inhalt nicht automatisch.

## Fragen zur Verarbeitung

Für Fragen zum Verhalten des Erweiterungscodes den Projektkontakt verwenden. Fragen zu einem KI:connect-Konto, zur dienstseitigen Speicherung oder zum Löschen dort übertragener Inhalte an den für deinen Zugang zuständigen Betreiber richten. Die technische Beschreibung trifft keine pauschale Aussage über datenschutzrechtliche Rollen oder die Zulässigkeit konkreter dienstlicher Inhalte.
