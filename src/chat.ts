import * as vscode from 'vscode';
import { KIConnectAPI } from './api';
import { SECRET_KEY } from './provider';

export const SELECTED_MODEL_KEY = 'kiconnect.selectedModel';

/** Validate model selection before handing it to the integrated VS Code chat. */
export async function openChat(context: vscode.ExtensionContext, modelId?: string): Promise<void> {
  try {
    const key = await context.secrets.get(SECRET_KEY);
    if (!key) {
      await vscode.commands.executeCommand('kiconnect.startSetup');
      return;
    }
    const models = await new KIConnectAPI(key).getModels(AbortSignal.timeout(15000));
    if (!models.length) throw new Error('Für diesen Schlüssel sind keine Chatmodelle verfügbar.');
    let selected = modelId ? models.find(model => model.id === modelId) : undefined;
    if (modelId && !selected) throw new Error('Das ausgewählte Modell ist nicht mehr verfügbar. Führe „KI:connect: Chat öffnen“ aus und wähle ein anderes Modell.');
    if (!selected) {
      const choice = await vscode.window.showQuickPick(
        models.map(model => ({ label: model.name, description: model.id, detail: model.toolCalling ? 'Textchat und Agent-Werkzeuge' : 'Textchat (Ask)', modelId: model.id })),
        { title: 'KI:connect: Chatmodell auswählen', placeHolder: 'Modell für den integrierten VS-Code-Chat wählen' }
      );
      if (!choice) return;
      selected = models.find(model => model.id === choice.modelId);
    }
    if (!selected) return;
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      mode: 'ask', modelSelector: { vendor: 'kiconnect', id: selected.id },
    });
    await context.globalState.update(SELECTED_MODEL_KEY, selected.id);
  } catch (error) {
    vscode.window.showErrorMessage(`KI:connect: Chat konnte nicht geöffnet werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
