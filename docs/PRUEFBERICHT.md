# Technischer Prüfstand 1.0.0

## Automatisiert geprüft

- TypeScript-Kompilierung und 30 Tests des produktiven Providers und API-Clients bestanden.
- Modellabfrage, Schlüsselprüfung und sichere Ablage mit simulierten HTTP-Antworten.
- Streaming, Gesprächsverlauf, parallele Werkzeugaufrufe und Abbrüche.
- Tutorial, direkte Modellauswahl und Wiederherstellung nach dem Neuladen.
- Lokale o200k-BPE-Zählung einschließlich Unicode, Werkzeugergebnissen und langen Codebezeichnern.
- 199.998 Tokenizer-Ränge gegen den offiziellen SHA-256-Hash geprüft.
- VSIX erstellt; Lizenzdatei und Tokenizer-Daten im Paket enthalten.

## Praktisch noch zu prüfen

Die gemeldete Folge schneller Kontextkomprimierungen wurde im Screenshot bestätigt. Der alte Bytezähler überschätzte normale Textnachrichten deutlich; dieser Zähler wurde durch o200k-BPE ersetzt und das Standardbudget auf 131.072 Tokens erhöht. Eine erneute Prüfung derselben Unterhaltung mit GPT-OSS-120B über die echte KI:connect-API steht aus. Deshalb wird keine vollständige Behebung der Komprimierungsschleife behauptet.

Nach Installation Fenster neu laden und eine neue Unterhaltung mit KI:connect: GPT-OSS-120B starten. Ask- und Agent-Modus, Folgefragen, Dateikontext und Abbruch praktisch prüfen. Die wiederholte allgemeine Antwort des 120B-Modells ist ohne konkrete Anfrage/Antwort und Live-API-Test nicht abschließend eingegrenzt.

VS Code bestimmt den Komprimierungszeitpunkt. Servermetadaten haben Vorrang vor konfigurierten Budgets. Für andere Modellfamilien bleibt die Tokenzählung eine Referenz mit Reserve.
