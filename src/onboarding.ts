import * as vscode from 'vscode';
import { KIConnectAPI, ModelInfo } from './api';
import { SECRET_KEY } from './provider';

/** One setup panel per extension host; secrets never travel back into the webview. */
export function registerOnboarding(context: vscode.ExtensionContext): void {
  let panel: vscode.WebviewPanel | undefined;
  const show = () => {
    if (panel) { panel.reveal(); return; }
    const media = vscode.Uri.joinPath(context.extensionUri, 'media');
    const current = vscode.window.createWebviewPanel('kiconnect.setup', 'KI:connect · Einrichtung', vscode.ViewColumn.One, {
      enableScripts: true, localResourceRoots: [media],
    });
    panel = current;
    let models: ModelInfo[] = [];
    let busy = false;
    let disposed = false;
    current.onDidDispose(() => { disposed = true; panel = undefined; });
    const uri = (file: string) => current.webview.asWebviewUri(vscode.Uri.joinPath(media, file));
    current.webview.html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${current.webview.cspSource}; script-src ${current.webview.cspSource};">
      <link rel="stylesheet" href="${uri('setup.css')}"><title>KI:connect einrichten</title></head>
      <body><main><header><span class="brand">KI<span class="accent">:</span>connect</span><span>Einrichtung</span></header>
      <nav aria-label="Einrichtungsschritte"><ol><li aria-current="step"><span>01</span> Willkommen</li><li><span>02</span> API-Schlüssel</li><li><span>03</span> Loslegen</li></ol></nav>
      <section id="welcome"><p class="eyebrow">Dein Zugang zum VS-Code-Chat</p><h1>Einmal verbinden.<br>Direkt loslegen.</h1>
      <p class="intro">Nutze die Modelle deines KI:connect-Kontos direkt beim Programmieren – mit gestreamten Antworten im integrierten VS-Code-Chat.</p>
      <div class="facts"><article><h2>Dein Schlüssel</h2><p>Wird im geschützten Schlüsselspeicher von VS Code hinterlegt.</p></article><article><h2>Deine Modelle</h2><p>Wir prüfen den Zugang und zeigen dir die verfügbaren Chatmodelle.</p></article></div>
      <button id="start">Einrichtung starten</button><p class="hint">Du brauchst ein KI:connect-Konto und deinen persönlichen API-Schlüssel.</p></section>
      <section id="credentials" hidden><p class="eyebrow">Schritt 02 / Zugang verbinden</p><h1>Dein Schlüssel.<br>Dein Zugang.</h1>
      <p class="intro">Kopiere deinen persönlichen API-Schlüssel aus deinem KI:connect-Konto und füge ihn hier ein.</p>
      <button class="secondary" id="account">KI:connect im Browser öffnen</button>
      <form id="key-form"><label for="key">API-Schlüssel</label><div class="input-row"><input id="key" type="password" autocomplete="off" spellcheck="false" required placeholder="API-Schlüssel einfügen"><button type="button" id="visibility" class="secondary" aria-pressed="false">Anzeigen</button></div>
      <p class="hint">Der Schlüssel wird nur zur Prüfung an KI:connect gesendet und anschließend sicher in VS Code gespeichert.</p>
      <button id="validate" type="submit">Schlüssel prüfen und weiter</button></form><button class="text" id="back">Zurück</button></section>
      <section id="ready" hidden><p class="eyebrow">Schritt 03 / Bereit für deinen ersten Chat</p><h1>Verbunden.<br>Du kannst starten.</h1>
      <p id="model-count" class="intro"></p><label for="model">Chatmodell</label><select id="model"></select>
      <p id="capability" class="hint"></p><div class="tip"><h2>Dein erster Schritt</h2><p>Öffne eine Datei und frage im Chat zum Beispiel: „Erkläre mir diesen Code.“ Füge die Datei im Chat als Kontext hinzu.</p></div>
      <button id="open-chat">Modell auswählen und Chat öffnen</button><button class="text" id="change-key">Anderen Schlüssel verwenden</button></section>
      <p id="status" role="status" aria-live="polite"></p>
      <footer><span id="progress">Schritt 1 von 3</span><button class="text" id="skip">Später einrichten</button></footer>
      </main><script src="${uri('setup.js')}"></script></body></html>`;
    context.subscriptions.push(current, current.webview.onDidReceiveMessage(async message => {
      if (!message || typeof message !== 'object' || disposed) return;
      if (message.type === 'skip') { current.dispose(); return; }
      if (message.type === 'account') {
        await vscode.env.openExternal(vscode.Uri.parse('https://chat.kiconnect.nrw'));
        return;
      }
      if (busy) return;
      busy = true;
      try {
        if (message.type === 'validate') {
          if (typeof message.key !== 'string' || !message.key.trim()) throw new Error('Bitte gib einen API-Schlüssel ein.');
          const key = message.key.trim();
          const available = await new KIConnectAPI(key).getModels(AbortSignal.timeout(15000));
          if (!available.length) throw new Error('Für diesen Schlüssel sind keine Chatmodelle freigegeben. Prüfe dein KI:connect-Konto.');
          if (disposed) return;
          await context.secrets.store(SECRET_KEY, key);
          models = available;
          await current.webview.postMessage({ type: 'models', models });
        } else if (message.type === 'openChat') {
          if (!models.some(model => model.id === message.modelId)) throw new Error('Bitte wähle ein geprüftes Modell aus.');
          await vscode.commands.executeCommand('kiconnect.openChat', message.modelId);
          await context.globalState.update('kiconnect.setupCompleted', true);
          current.dispose();
        }
      } catch (error) {
        if (!disposed) await current.webview.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Die Einrichtung konnte nicht abgeschlossen werden. Versuche es erneut.' });
      } finally { busy = false; }
    }));
  };
  context.subscriptions.push(vscode.commands.registerCommand('kiconnect.startSetup', show));
  if (!context.globalState.get('kiconnect.setupShown') && !context.globalState.get('kiconnect.setupCompleted')) {
    show();
    void context.globalState.update('kiconnect.setupShown', true);
  }
}
