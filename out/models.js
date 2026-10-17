"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsTools = supportsTools;
exports.readTokenMetadata = readTokenMetadata;
exports.tokenBudget = tokenBudget;
/** Explizite API-Metadaten haben Vorrang; andernfalls werden bekannte Modellfamilien zugeordnet. */
function supportsTools(model) {
    for (const capabilities of [model.capabilities, model.info?.meta?.capabilities]) {
        if (Array.isArray(capabilities)) {
            return capabilities.some(value => ['tools', 'tool_calling', 'function_calling'].includes(value));
        }
        if (capabilities && typeof capabilities === 'object') {
            const fields = capabilities;
            for (const name of ['toolCalling', 'tool_calling', 'function_calling']) {
                if (typeof fields[name] === 'boolean')
                    return fields[name];
            }
        }
    }
    const name = `${model.id} ${model.name ?? ''}`;
    if (/e5[-_ ]?mistral|embed|rerank/i.test(name))
        return false;
    return /gpt[-_ ]?oss|qwen\s*3|mistral[-_ ]?small[-_ ]?[34]/i.test(name);
}
function positive(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
/** Accept only numeric, finite token limits. Server metadata is optional. */
function readTokenMetadata(model) {
    const info = model.info;
    const sources = [model, info?.meta, info?.params];
    const read = (...names) => {
        for (const source of sources)
            for (const name of names) {
                if (source && positive(source[name]))
                    return source[name];
            }
        return undefined;
    };
    return {
        contextWindow: read('context_length', 'context_window', 'max_model_len', 'num_ctx'),
        maxInputTokens: read('max_input_tokens'),
        maxOutputTokens: read('max_output_tokens'),
    };
}
function tokenBudget(model, fallbackContext = 131072, fallbackOutput = 8192) {
    const desiredOutput = model.maxOutputTokens ?? (positive(fallbackOutput) ? fallbackOutput : 8192);
    const context = model.contextWindow ?? (model.maxInputTokens !== undefined
        ? model.maxInputTokens + desiredOutput
        : positive(fallbackContext) && fallbackContext >= 2 ? fallbackContext : 131072);
    const maxOutputTokens = Math.min(desiredOutput, Math.max(1, Math.floor(context / 2)));
    const maxInputTokens = Math.min(model.maxInputTokens ?? context, Math.max(1, context - maxOutputTokens));
    return { maxInputTokens, maxOutputTokens };
}
//# sourceMappingURL=models.js.map