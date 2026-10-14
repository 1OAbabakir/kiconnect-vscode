"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsTools = supportsTools;
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
//# sourceMappingURL=models.js.map