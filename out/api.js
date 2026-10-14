"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIConnectAPI = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Minimal client for the KI:connect OpenAI‑compatible API.
 * The base URL is taken from the public documentation – adjust if it changes.
 */
class KIConnectAPI {
    baseUrl = 'https://chat.kiconnect.nrw/api/v1';
    token;
    constructor(token) {
        this.token = token;
    }
    /** Helper to perform an authenticated request */
    async request(endpoint, init) {
        const url = `${this.baseUrl}/${endpoint}`;
        const response = await (0, node_fetch_1.default)(url, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...init?.headers,
            },
        });
        if (!response.ok) {
            const errTxt = await response.text();
            throw new Error(`KIConnect API error ${response.status}: ${errTxt}`);
        }
        return (await response.json());
    }
    /** Retrieve the list of available models */
    async getModels() {
        // Assuming the endpoint returns { data: [{ id, object }...] } similar to OpenAI
        const result = await this.request('models');
        // Transform to simple {id, name}
        return result.data.map((m) => ({ id: m.id, name: m.id }));
    }
    /** Send a chat request and return a streamed async iterator of strings */
    async *chat(modelId, messages) {
        const response = await (0, node_fetch_1.default)(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
                stream: true,
            }),
        });
        if (!response.ok) {
            const errTxt = await response.text();
            throw new Error(`Chat request failed ${response.status}: ${errTxt}`);
        }
        // The API is OpenAI‑compatible streaming via Server‑Sent Events (data: ...)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        while (reader) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            // split on newlines, each line prefixed with "data: "
            const lines = buffer.split(/\r?\n/);
            // keep incomplete last line
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(payload);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content)
                            yield content;
                    }
                    catch {
                        // ignore malformed lines
                    }
                }
            }
        }
    }
}
exports.KIConnectAPI = KIConnectAPI;
//# sourceMappingURL=api.js.map