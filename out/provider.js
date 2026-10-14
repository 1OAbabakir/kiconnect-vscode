"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIConnectChatProvider = void 0;
const api_1 = require("./api");
/**
 * Implements the VS Code LanguageModelChatProvider API.
 * It forwards chat messages to KI:connect and streams the response back.
 */
class KIConnectChatProvider {
    context;
    constructor(context) {
        this.context = context;
    }
    /** Load the stored API key */
    async getApiKey() {
        return this.context.secrets.get('kiconnect.apiKey');
    }
    /** Provide chat model information – required by the LanguageModelChatProvider interface */
    async provideLanguageModelChatInformation(_options, _token) {
        // No additional model info needed here; models are registered individually.
        return [];
    }
    async sendRequest(request, _context, token) {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error('KI:connect API key not configured – run the "Set API Key" command.');
        }
        const api = new api_1.KIConnectAPI(apiKey);
        const modelId = request.model;
        // Build a minimal messages array for the API.
        // We include an optional empty system prompt and the user's current prompt.
        const messages = [
            { role: 'system', content: '' },
            { role: 'user', content: request.prompt },
        ];
        // Create a response object that streams data back to VS Code.
        const response = { stream: { append: (s) => { }, end: () => { } } };
        // Stream the API response.
        (async () => {
            try {
                for await (const chunk of api.chat(modelId, messages)) {
                    if (token.isCancellationRequested) {
                        response.cancel();
                        break;
                    }
                    response.stream.append(chunk);
                }
                response.stream.end();
            }
            catch (e) {
                response.stream.append(`\n[Error] ${e.message}`);
                response.stream.end();
            }
        })();
        return response;
    }
}
exports.KIConnectChatProvider = KIConnectChatProvider;
//# sourceMappingURL=provider.js.map