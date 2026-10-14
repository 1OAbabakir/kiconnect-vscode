"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const provider_1 = require("./provider");
const api_1 = require("./api");
function activate(context) {
    const provider = new provider_1.KIConnectChatProvider(context);
    context.subscriptions.push(provider, vscode.lm.registerLanguageModelChatProvider('kiconnect', provider), context.secrets.onDidChange(event => {
        if (event.key === provider_1.SECRET_KEY)
            provider.refresh();
    }), vscode.commands.registerCommand('kiconnect.setApiKey', async () => {
        const key = await vscode.window.showInputBox({
            prompt: 'Gib deinen persönlichen KI:connect-API-Schlüssel ein', ignoreFocusOut: true, password: true,
            validateInput: value => value.trim() ? undefined : 'Bitte gib einen API-Schlüssel ein.',
        });
        if (!key?.trim())
            return;
        try {
            const models = await new api_1.KIConnectAPI(key.trim()).getModels(AbortSignal.timeout(15000));
            if (models.length === 0) {
                vscode.window.showErrorMessage('KI:connect liefert für diesen Schlüssel keine Modelle. Prüfe die Modellfreigaben in deinem KI:connect-Konto. Der bisherige Schlüssel bleibt erhalten.');
                return;
            }
            await context.secrets.store(provider_1.SECRET_KEY, key.trim());
            vscode.window.showInformationMessage(`KI:connect: Schlüssel geprüft, ${models.length} Modelle gefunden. Im Chat unten ein KI:connect-Modell auswählen. Modelle mit Werkzeugunterstützung sind im Agent-Modus verfügbar.`);
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : 'Unbekannter Fehler';
            vscode.window.showErrorMessage(`KI:connect: Schlüssel konnte nicht geprüft werden: ${detail} Der bisherige Schlüssel bleibt erhalten.`);
        }
    }), vscode.commands.registerCommand('kiconnect.openChat', async () => {
        try {
            const key = await context.secrets.get(provider_1.SECRET_KEY);
            if (!key) {
                vscode.window.showErrorMessage('Bitte zuerst „KI:connect: API-Schlüssel hinterlegen“ ausführen.');
                return;
            }
            const models = await new api_1.KIConnectAPI(key).getModels(AbortSignal.timeout(15000));
            if (!models.length) {
                vscode.window.showErrorMessage('KI:connect liefert keine Chatmodelle für diesen Schlüssel.');
                return;
            }
            const selected = await vscode.window.showQuickPick(models.map(model => ({ label: model.name, description: model.id, modelId: model.id })), { title: 'KI:connect: Chatmodell auswählen', placeHolder: 'Modell wählen – öffnet den Textchat im Ask-Modus' });
            if (!selected)
                return;
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                mode: 'ask', modelSelector: { vendor: 'kiconnect', id: selected.modelId },
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`KI:connect: Chat konnte nicht geöffnet werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
    }), vscode.commands.registerCommand('kiconnect.clearApiKey', async () => {
        await context.secrets.delete(provider_1.SECRET_KEY);
        vscode.window.showInformationMessage('Der KI:connect-API-Schlüssel wurde entfernt.');
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map