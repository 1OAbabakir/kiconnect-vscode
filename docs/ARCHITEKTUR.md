# Architektur

## Aufbau

| Modul | Verantwortung |
| --- | --- |
| `src/extension.ts` | Erweiterung aktivieren, Befehle registrieren und Schlüsseländerungen behandeln. |
| `src/chat.ts` | Modellwahl prüfen, Auswahl merken und integrierten Chat öffnen. |
| `src/onboarding.ts` | Interaktives Einrichtungstutorial als Webview bereitstellen. |
| `src/provider.ts` | VS-Code-Provider implementieren, Nachrichten übersetzen und Antwortteile melden. |
| `src/api.ts` | HTTP-Anfragen, Modellliste und OpenAI-kompatiblen Antwortdatenstrom verarbeiten. |
| `src/models.ts` | Werkzeugfähigkeit und Tokenbudgets aus Metadaten beziehungsweise konfigurierten Vorgaben ableiten. |
| `src/tokenizer/` | Lokale BPE-Tokenzählung mit mitgelieferten o200k-Rängen. |
| `test/chat.test.cjs` | Verhalten mit simulierten HTTP-Antworten und einer kleinen VS-Code-Testumgebung prüfen. |

Es wird genau ein Provider unter der Kennung `kiconnect` registriert. Er liefert mehrere Modelle. Die Kennungen in `package.json` und bei der Registrierung müssen übereinstimmen.

## Nachrichtenweg

```mermaid
sequenceDiagram
    participant U as Nutzerin oder Nutzer
    participant V as VS-Code-Chat
    participant P as KI:connect-Provider
    participant A as KI:connect-API
    U->>V: Nachricht und Modell auswählen
    V->>P: Verlauf, Werkzeugdefinitionen und Abbruchsignal
    P->>A: Chat-Anfrage mit Modellkennung
    A-->>P: Textfragmente oder Werkzeugaufrufe
    P-->>V: Textteile oder vollständige Werkzeugaufrufe
    V->>V: Werkzeugausführung und nötige Bestätigungen
    V->>P: Nächste Anfrage mit Werkzeugergebnissen
```

## Werkzeugaufrufe

VS Code übergibt Namen, Beschreibungen und Eingabeschemata verfügbarer Werkzeuge. Der Provider übersetzt sie in OpenAI-kompatible `tools`. `toolMode` wird als `tool_choice: auto` oder `required` übermittelt.

Im Antwortdatenstrom können mehrere Werkzeugaufrufe parallel und fragmentiert eintreffen. Der API-Client sammelt sie nach Index und prüft vor der Übergabe Kennung, Werkzeugname und JSON-Argumente. Unbekannte Werkzeuge und unvollständige Aufrufe führen zu einem Fehler. Die Erweiterung gibt vollständige Aufrufe als `LanguageModelToolCallPart` an VS Code zurück und führt sie nicht selbst aus.

In späteren Anfragen bleiben Assistentenaufrufe als `tool_calls` erhalten. Ergebnisse werden als `tool`-Nachrichten mit passender `tool_call_id` übertragen, bevor neuer Nutzertext folgt.

## Fähigkeiten und Grenzen

Explizite Angaben in `capabilities` oder `info.meta.capabilities` haben Vorrang. Erkannt werden auch Fähigkeitslisten mit `tools`, `tool_calling` oder `function_calling`.

Fehlen verwertbare Metadaten, werden GPT-OSS, Qwen 3 und Mistral Small 3/4 anhand ihres Namens als toolfähig eingeordnet. Das ersetzt keinen Test der konkreten Bereitstellung. E5-Mistral und unbekannte Familien bleiben ohne positive Angaben Textmodelle. Modelle mit `embed` oder `rerank` in Kennung oder Name werden aus der Chatmodellliste entfernt.

Bilder werden nicht unterstützt. Die gemeldeten Tokenbudgets verwenden API-Grenzen und bei fehlenden Angaben einstellbare Vorgaben; die Texttokenisierung verwendet lokal o200k-BPE für GPT-OSS. Andere Modellfamilien erhalten eine Referenzzählung mit Reserve. VS Code verwaltet den Gesprächskontext.

## Abbruch und Lebenszyklus

Ein VS-Code-Abbruchsignal wird in einen `AbortController` übersetzt. Dadurch endet die zugehörige HTTP-Anfrage. Ereignisabonnements und Datenstromleser werden anschließend freigegeben.

Ändert sich der gespeicherte Schlüssel, meldet der Provider eine Änderung seiner Modellinformationen. VS Code kann die Modellliste daraufhin neu abfragen.
