/** Explizite API-Metadaten haben Vorrang; andernfalls werden bekannte Modellfamilien zugeordnet. */
export function supportsTools(model: { id: string; name?: string; capabilities?: unknown; info?: { meta?: { capabilities?: unknown } } }): boolean {
  for (const capabilities of [model.capabilities, model.info?.meta?.capabilities]) {
    if (Array.isArray(capabilities)) {
      return capabilities.some(value => ['tools', 'tool_calling', 'function_calling'].includes(value));
    }
    if (capabilities && typeof capabilities === 'object') {
      const fields = capabilities as Record<string, unknown>;
      for (const name of ['toolCalling', 'tool_calling', 'function_calling']) {
        if (typeof fields[name] === 'boolean') return fields[name];
      }
    }
  }
  const name = `${model.id} ${model.name ?? ''}`;
  if (/e5[-_ ]?mistral|embed|rerank/i.test(name)) return false;
  return /gpt[-_ ]?oss|qwen\s*3|mistral[-_ ]?small[-_ ]?[34]/i.test(name);
}

export interface TokenMetadata {
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Accept only numeric, finite token limits. Server metadata is optional. */
export function readTokenMetadata(model: Record<string, unknown>): TokenMetadata {
  const info = model.info as { meta?: Record<string, unknown>; params?: Record<string, unknown> } | undefined;
  const sources = [model, info?.meta, info?.params];
  const read = (...names: string[]) => {
    for (const source of sources) for (const name of names) {
      if (source && positive(source[name])) return source[name] as number;
    }
    return undefined;
  };
  return {
    contextWindow: read('context_length', 'context_window', 'max_model_len', 'num_ctx'),
    maxInputTokens: read('max_input_tokens'),
    maxOutputTokens: read('max_output_tokens'),
  };
}

export function tokenBudget(model: TokenMetadata, fallbackContext = 131072, fallbackOutput = 8192) {
  const desiredOutput = model.maxOutputTokens ?? (positive(fallbackOutput) ? fallbackOutput : 8192);
  const context = model.contextWindow ?? (model.maxInputTokens !== undefined
    ? model.maxInputTokens + desiredOutput
    : positive(fallbackContext) && fallbackContext >= 2 ? fallbackContext : 131072);
  const maxOutputTokens = Math.min(desiredOutput, Math.max(1, Math.floor(context / 2)));
  const maxInputTokens = Math.min(model.maxInputTokens ?? context, Math.max(1, context - maxOutputTokens));
  return { maxInputTokens, maxOutputTokens };
}
