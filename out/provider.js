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
exports.KIConnectChatProvider = exports.SECRET_KEY = void 0;
const tokenizer_1 = require("./tokenizer");
const models_1 = require("./models");
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
exports.SECRET_KEY = 'kiconnect.apiKey';
class KIConnectChatProvider {
    context;
    changes = new vscode.EventEmitter();
    onDidChangeLanguageModelChatInformation = this.changes.event;
    constructor(context) {
        this.context = context;
    }
    refresh() { this.changes.fire(); }
    dispose() { this.changes.dispose(); }
    async withCancellation(token, run) {
        const controller = new AbortController();
        const subscription = token.onCancellationRequested(() => controller.abort());
        try {
            if (token.isCancellationRequested)
                throw new vscode.CancellationError();
            return await run(controller.signal);
        }
        catch (error) {
            if (token.isCancellationRequested)
                throw new vscode.CancellationError();
            throw error;
        }
        finally {
            subscription.dispose();
        }
    }
    async provideLanguageModelChatInformation(_options, token) {
        const key = await this.context.secrets.get(exports.SECRET_KEY);
        if (!key)
            return [];
        return this.withCancellation(token, async (signal) => {
            const models = await new api_1.KIConnectAPI(key).getModels(signal);
            const config = vscode.workspace?.getConfiguration('kiconnect');
            return models.map(model => {
                const budget = (0, models_1.tokenBudget)(model, config?.get('fallbackContextWindow'), config?.get('fallbackMaxOutputTokens'));
                return {
                    id: model.id, name: `KI:connect: ${model.name}`, family: model.id, version: '1',
                    ...budget,
                    tooltip: `KI:connect · ${budget.maxInputTokens.toLocaleString('de-DE')} Eingabe- und ${budget.maxOutputTokens.toLocaleString('de-DE')} Antworttokens${model.contextWindow || model.maxInputTokens ? '' : ' (konfigurierte Vorgabe)'}`,
                    detail: model.toolCalling ? 'KI:connect · Werkzeuge' : 'KI:connect · Textchat',
                    capabilities: { imageInput: false, toolCalling: model.toolCalling },
                };
            });
        });
    }
    convertMessages(messages) {
        const converted = [];
        const textContent = (parts) => parts.map(part => {
            if (!(part instanceof vscode.LanguageModelTextPart)) {
                throw new Error('Für diesen Inhaltstyp unterstützt KI:connect nur Textnachrichten; Bilder werden nicht unterstützt.');
            }
            return part.value;
        }).join('');
        for (const message of messages) {
            const assistant = message.role === vscode.LanguageModelChatMessageRole.Assistant;
            const text = [];
            const calls = [];
            const results = [];
            for (const part of message.content) {
                if (part instanceof vscode.LanguageModelTextPart)
                    text.push(part);
                else if (part instanceof vscode.LanguageModelToolCallPart && assistant) {
                    calls.push({ id: part.callId, type: 'function', function: { name: part.name, arguments: JSON.stringify(part.input) } });
                }
                else if (part instanceof vscode.LanguageModelToolResultPart && !assistant) {
                    results.push({ role: 'tool', tool_call_id: part.callId, content: textContent(part.content) });
                }
                else {
                    throw new Error('Für diesen Inhaltstyp unterstützt KI:connect nur Textnachrichten; Bilder oder falsch zugeordnete Werkzeugnachrichten werden nicht unterstützt.');
                }
            }
            // Werkzeugergebnisse müssen direkt auf die Aufrufe folgen, noch vor einer neuen Nutzernachricht.
            converted.push(...results);
            if (text.length || calls.length || !results.length) {
                const entry = { role: assistant ? 'assistant' : 'user', content: textContent(text) };
                if (calls.length)
                    entry.tool_calls = calls;
                converted.push(entry);
            }
        }
        return converted;
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        const key = await this.context.secrets.get(exports.SECRET_KEY);
        if (!key)
            throw new Error('Führe zuerst „KI:connect: API-Schlüssel hinterlegen“ aus.');
        const tools = options.tools ?? [];
        if (options.toolMode === vscode.LanguageModelChatToolMode.Required && !tools.length) {
            throw new Error('Der Modus für erforderliche Werkzeugaufrufe benötigt mindestens ein Werkzeug.');
        }
        if (tools.length && model.capabilities?.toolCalling === false) {
            throw new Error('Dieses KI:connect-Modell unterstützt keine Werkzeugaufrufe. Wähle ein Modell mit Werkzeugunterstützung.');
        }
        const requestOptions = tools.length ? {
            tools: tools.map(tool => ({ type: 'function', function: {
                    name: tool.name, description: tool.description,
                    parameters: tool.inputSchema ?? { type: 'object', properties: {} },
                } })),
            tool_choice: options.toolMode === vscode.LanguageModelChatToolMode.Required ? 'required' : 'auto',
        } : {};
        if (model.maxOutputTokens > 0)
            requestOptions.max_tokens = model.maxOutputTokens;
        const converted = this.convertMessages(messages);
        await this.withCancellation(token, async (signal) => {
            for await (const chunk of new api_1.KIConnectAPI(key).chat(model.id, converted, signal, requestOptions)) {
                if (token.isCancellationRequested)
                    throw new vscode.CancellationError();
                progress.report(typeof chunk === 'string'
                    ? new vscode.LanguageModelTextPart(chunk)
                    : new vscode.LanguageModelToolCallPart(chunk.callId, chunk.name, chunk.input));
            }
        });
    }
    async provideTokenCount(_model, text, _token) {
        const content = typeof text === 'string' ? text : JSON.stringify(this.convertMessages([text]));
        const count = (0, tokenizer_1.countTokens)(content);
        // Harmony-Texttokenizer für GPT-OSS; bei anderen Familien Referenzzählung mit Reserve.
        const textTokens = /gpt[-_ ]?oss/i.test(_model.id ?? '') ? count : Math.ceil(count * 1.1);
        return textTokens + (typeof text === 'string' ? 0 : 8);
    }
}
exports.KIConnectChatProvider = KIConnectChatProvider;
//# sourceMappingURL=provider.js.map