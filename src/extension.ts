import * as vscode from 'vscode';
import { KIConnectChatProvider, SECRET_KEY } from './provider';
import { KIConnectAPI } from './api';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new KIConnectChatProvider(context);
  context.subscriptions.push(
    provider,
    vscode.lm.registerLanguageModelChatProvider('kiconnect', provider),
    context.secrets.onDidChange(event => {
      if (event.key === SECRET_KEY) provider.refresh();
    }),
    vscode.commands.registerCommand('kiconnect.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Gib deinen persönlichen KI:connect-API-Schlüssel ein', ignoreFocusOut: true, password: true,
        validateInput: value => value.trim() ? undefined : 'Bitte gib einen API-Schlüssel ein.',
      });
      if (!key?.trim()) return;
      try {
        const models = await new KIConnectAPI(key.trim()).getModels(AbortSignal.timeout(15000));
        if (models.length === 0) {
          vscode.window.showErrorMessage('KI:connect liefert für diesen Schlüssel keine Modelle. Prüfe die Modellfreigaben in deinem KI:connect-Konto. Der bisherige Schlüssel bleibt erhalten.');
          return;
        }
        await context.secrets.store(SECRET_KEY, key.trim());
        vscode.window.showInformationMessage(`KI:connect: Schlüssel geprüft, ${models.length} Modelle gefunden. Im Chat unten ein KI:connect-Modell auswählen. Modelle mit Werkzeugunterstützung sind im Agent-Modus verfügbar.`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unbekannter Fehler';
        vscode.window.showErrorMessage(`KI:connect: Schlüssel konnte nicht geprüft werden: ${detail} Der bisherige Schlüssel bleibt erhalten.`);
      }
    }),
    vscode.commands.registerCommand('kiconnect.openChat', async () => {
      try {
        const key = await context.secrets.get(SECRET_KEY);
        if (!key) {
          vscode.window.showErrorMessage('Bitte zuerst „KI:connect: API-Schlüssel hinterlegen“ ausführen.');
          return;
        }
        const models = await new KIConnectAPI(key).getModels(AbortSignal.timeout(15000));
        if (!models.length) {
          vscode.window.showErrorMessage('KI:connect liefert keine Chatmodelle für diesen Schlüssel.');
          return;
        }
        const selected = await vscode.window.showQuickPick(
          models.map(model => ({ label: model.name, description: model.id, modelId: model.id })),
          { title: 'KI:connect: Chatmodell auswählen', placeHolder: 'Modell wählen – öffnet den Textchat im Ask-Modus' }
        );
        if (!selected) return;
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          mode: 'ask', modelSelector: { vendor: 'kiconnect', id: selected.modelId },
        });
      } catch (error) {
        vscode.window.showErrorMessage(`KI:connect: Chat konnte nicht geöffnet werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }),
    vscode.commands.registerCommand('kiconnect.clearApiKey', async () => {
      await context.secrets.delete(SECRET_KEY);
      vscode.window.showInformationMessage('Der KI:connect-API-Schlüssel wurde entfernt.');
    })
  );
}

export function deactivate(): void {}
