import { openChat, SELECTED_MODEL_KEY } from './chat';
import { registerOnboarding } from './onboarding';
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
    vscode.commands.registerCommand('kiconnect.openChat', (modelId?: string) => openChat(context, modelId)),
    vscode.commands.registerCommand('kiconnect.clearApiKey', async () => {
      await context.secrets.delete(SECRET_KEY);
      vscode.window.showInformationMessage('Der KI:connect-API-Schlüssel wurde entfernt.');
    })
  );
  const configurationChanges = vscode.workspace?.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('kiconnect')) provider.refresh();
  });
  if (configurationChanges) context.subscriptions.push(configurationChanges);
  const selectedModel = context.globalState.get<string>(SELECTED_MODEL_KEY);
  if (typeof selectedModel === 'string') void openChat(context, selectedModel);
  registerOnboarding(context);
}

export function deactivate(): void {}
