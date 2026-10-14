import * as vscode from 'vscode';
import { KIConnectChatProvider } from './provider';
import { KIConnectAPI } from './api';

const SECRET_KEY = 'kiconnect.apiKey';

/** Prompt for API key and store it securely */
async function setApiKey(context: vscode.ExtensionContext) {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your KI:connect API key',
    ignoreFocusOut: true,
    password: true,
  });
  if (key) {
    await context.secrets.store(SECRET_KEY, key);
    vscode.window.showInformationMessage('KI:connect API key stored securely.');
    // Refresh models after key change
    await registerModels(context);
  }
}

/** Remove stored API key */
async function clearApiKey(context: vscode.ExtensionContext) {
  await context.secrets.delete(SECRET_KEY);
  vscode.window.showInformationMessage('KI:connect API key cleared.');
}

/** Fetch models from the API and register them with VS Code */
async function registerModels(context: vscode.ExtensionContext) {
  const apiKey = await context.secrets.get(SECRET_KEY);
  if (!apiKey) {
    // No key – nothing to register.
    return;
  }
  const api = new KIConnectAPI(apiKey);
  try {
    const models = await api.getModels();
    const disposables: vscode.Disposable[] = [];
    // Unregister any previous providers (VS Code disposes them automatically on reload).
    for (const model of models) {
      const provider = new KIConnectChatProvider(context);
      const disposable = vscode.lm.registerLanguageModelChatProvider(
        `kiconnect:${model.id}`,
        provider as any
      );
      disposables.push(disposable);
    }
    // Keep disposables alive for the extension lifecycle
    context.subscriptions.push(...disposables);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to load KI:connect models: ${e.message}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Register commands for API key handling
  context.subscriptions.push(
    vscode.commands.registerCommand('kiconnect.setApiKey', () => setApiKey(context)),
    vscode.commands.registerCommand('kiconnect.clearApiKey', () => clearApiKey(context))
  );

  // If a key already exists, register models immediately.
  registerModels(context);
}

export function deactivate() {
  // VS Code disposes all subscriptions automatically.
}
