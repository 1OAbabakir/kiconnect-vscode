"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIConnectAPI = void 0;
const models_1 = require("./models");
/** Client für die OpenAI-kompatible KI:connect-API mit der nativen fetch-Funktion von Node.js. */
class KIConnectAPI {
    token;
    baseUrl = 'https://chat.kiconnect.nrw/api/v1';
    constructor(token) {
        this.token = token;
    }
    async request(endpoint, init = {}) {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
            ...init,
            headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            // Serverantworten können Zugangsdaten enthalten und werden deshalb nicht in Fehlermeldungen übernommen.
            throw new Error(`KI:connect-Anfrage fehlgeschlagen (HTTP ${response.status}). Prüfe deinen API-Schlüssel und die Modellfreigaben.`);
        }
        return response;
    }
    async getModels(signal) {
        const response = await this.request('models', { signal });
        const result = await response.json();
        if (!Array.isArray(result.data) || result.data.some((m) => !m || typeof m.id !== 'string' || !m.id)) {
            throw new Error('KI:connect hat eine ungültige Modellliste zurückgegeben.');
        }
        return result.data.filter((m) => !/embed|rerank/i.test(`${m.id} ${m.name ?? ''}`)).map((m) => ({ id: m.id, name: typeof m.name === 'string' ? m.name : m.id, toolCalling: (0, models_1.supportsTools)(m) }));
    }
    async *chat(modelId, messages, signal, options = {}) {
        const response = await this.request('chat/completions', {
            method: 'POST', signal,
            body: JSON.stringify({ model: modelId, messages, stream: true, ...options }),
        });
        if (!response.body)
            throw new Error('KI:connect hat keinen Antwortdatenstrom zurückgegeben.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const calls = new Map();
        let emittedCalls = 0;
        const finishCalls = () => {
            const completed = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => {
                if (!call.id || !call.name)
                    throw new Error('KI:connect hat einen unvollständigen Werkzeugaufruf zurückgegeben.');
                if (!options.tools?.some(tool => tool.function.name === call.name)) {
                    throw new Error(`KI:connect hat ein nicht verfügbares Werkzeug angefordert: ${call.name}`);
                }
                const input = JSON.parse(call.arguments);
                if (!input || typeof input !== 'object' || Array.isArray(input)) {
                    throw new Error('Die Werkzeugargumente von KI:connect müssen ein JSON-Objekt sein.');
                }
                return { callId: call.id, name: call.name, input };
            });
            calls.clear();
            emittedCalls += completed.length;
            return completed;
        };
        const parse = (line) => {
            if (!line.startsWith('data:'))
                return { chunks: [] };
            const payload = line.slice(5).trim();
            if (!payload)
                return { chunks: [] };
            if (payload === '[DONE]')
                return { chunks: finishCalls(), done: true };
            const parsed = JSON.parse(payload);
            if (parsed.error)
                throw new Error('KI:connect hat einen Fehler im Antwortdatenstrom gemeldet.');
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            const chunks = [];
            if (typeof delta?.content === 'string' && delta.content)
                chunks.push(delta.content);
            for (const fragment of delta?.tool_calls ?? []) {
                if (!Number.isInteger(fragment.index) || fragment.index < 0)
                    throw new Error('Ungültiger Index eines Werkzeugaufrufs.');
                const call = calls.get(fragment.index) ?? { id: '', name: '', arguments: '' };
                if (typeof fragment.id === 'string')
                    call.id = fragment.id;
                if (typeof fragment.function?.name === 'string')
                    call.name += fragment.function.name;
                if (typeof fragment.function?.arguments === 'string')
                    call.arguments += fragment.function.arguments;
                calls.set(fragment.index, call);
            }
            if (choice?.finish_reason === 'length' || choice?.finish_reason === 'content_filter') {
                throw new Error(`Die KI:connect-Antwort wurde beendet: ${choice.finish_reason}.`);
            }
            if (choice?.finish_reason)
                chunks.push(...finishCalls());
            return { chunks };
        };
        try {
            while (true) {
                const { done, value } = await reader.read();
                buffer += decoder.decode(value, { stream: !done });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() ?? '';
                if (done && buffer) {
                    lines.push(buffer);
                    buffer = '';
                }
                for (const line of lines) {
                    const event = parse(line);
                    for (const chunk of event.chunks)
                        yield chunk;
                    if (event.done) {
                        if (options.tool_choice === 'required' && !emittedCalls)
                            throw new Error('KI:connect hat den erforderlichen Werkzeugaufruf nicht zurückgegeben.');
                        return;
                    }
                }
                if (done) {
                    // Werkzeugaufrufe benötigen ein Abschlussereignis; abgeschnittene Argumente werden nicht weitergegeben.
                    if (calls.size)
                        throw new Error('Der KI:connect-Antwortdatenstrom endete mit einem unvollständigen Werkzeugaufruf.');
                    if (options.tool_choice === 'required' && !emittedCalls)
                        throw new Error('KI:connect hat den erforderlichen Werkzeugaufruf nicht zurückgegeben.');
                    break;
                }
            }
        }
        finally {
            await reader.cancel().catch(() => { });
            reader.releaseLock();
        }
    }
}
exports.KIConnectAPI = KIConnectAPI;
//# sourceMappingURL=api.js.map