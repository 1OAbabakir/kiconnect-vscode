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
const SECRET_KEY = 'kiconnect.apiKey';
/** Prompt for API key and store it securely */
async function setApiKey(context) {
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
async function clearApiKey(context) {
    await context.secrets.delete(SECRET_KEY);
    vscode.window.showInformationMessage('KI:connect API key cleared.');
}
/** Fetch models from the API and register them with VS Code */
async function registerModels(context) {
    const apiKey = await context.secrets.get(SECRET_KEY);
    if (!apiKey) {
        // No key – nothing to register.
        return;
    }
    const api = new api_1.KIConnectAPI(apiKey);
    try {
        const models = await api.getModels();
        const disposables = [];
        // Unregister any previous providers (VS Code disposes them automatically on reload).
        for (const model of models) {
            const provider = new provider_1.KIConnectChatProvider(context);
            const disposable = vscode.lm.registerLanguageModelChatProvider(`kiconnect:${model.id}`, provider);
            disposables.push(disposable);
        }
        // Keep disposables alive for the extension lifecycle
        context.subscriptions.push(...disposables);
    }
    catch (e) {
        vscode.window.showErrorMessage(`Failed to load KI:connect models: ${e.message}`);
    }
}
function activate(context) {
    // Register commands for API key handling
    context.subscriptions.push(vscode.commands.registerCommand('kiconnect.setApiKey', () => setApiKey(context)), vscode.commands.registerCommand('kiconnect.clearApiKey', () => clearApiKey(context)));
    // If a key already exists, register models immediately.
    registerModels(context);
}
function deactivate() {
    // VS Code disposes all subscriptions automatically.
}
//# sourceMappingURL=extension.js.map