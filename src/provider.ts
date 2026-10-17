import { countTokens } from './tokenizer';
import { tokenBudget } from './models';
import * as vscode from 'vscode';
import { ChatMessage, ChatOptions, KIConnectAPI } from './api';

export const SECRET_KEY = 'kiconnect.apiKey';

export class KIConnectChatProvider implements vscode.LanguageModelChatProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation = this.changes.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  refresh(): void { this.changes.fire(); }
  dispose(): void { this.changes.dispose(); }

  private async withCancellation<T>(token: vscode.CancellationToken, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const subscription = token.onCancellationRequested(() => controller.abort());
    try {
      if (token.isCancellationRequested) throw new vscode.CancellationError();
      return await run(controller.signal);
    } catch (error) {
      if (token.isCancellationRequested) throw new vscode.CancellationError();
      throw error;
    } finally { subscription.dispose(); }
  }

  async provideLanguageModelChatInformation(_options: vscode.PrepareLanguageModelChatModelOptions, token: vscode.CancellationToken): Promise<vscode.LanguageModelChatInformation[]> {
    const key = await this.context.secrets.get(SECRET_KEY);
    if (!key) return [];
    return this.withCancellation(token, async signal => {
      const models = await new KIConnectAPI(key).getModels(signal);
      const config = vscode.workspace?.getConfiguration('kiconnect');
      return models.map(model => {
        const budget = tokenBudget(model, config?.get<number>('fallbackContextWindow'), config?.get<number>('fallbackMaxOutputTokens'));
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

  private convertMessages(messages: readonly vscode.LanguageModelChatRequestMessage[]): ChatMessage[] {
    const converted: ChatMessage[] = [];
    const textContent = (parts: readonly unknown[]): string => parts.map(part => {
      if (!(part instanceof vscode.LanguageModelTextPart)) {
        throw new Error('Für diesen Inhaltstyp unterstützt KI:connect nur Textnachrichten; Bilder werden nicht unterstützt.');
      }
      return part.value;
    }).join('');
    for (const message of messages) {
      const assistant = message.role === vscode.LanguageModelChatMessageRole.Assistant;
      const text: vscode.LanguageModelTextPart[] = [];
      const calls: NonNullable<ChatMessage['tool_calls']> = [];
      const results: ChatMessage[] = [];
      for (const part of message.content) {
        if (part instanceof vscode.LanguageModelTextPart) text.push(part);
        else if (part instanceof vscode.LanguageModelToolCallPart && assistant) {
          calls.push({ id: part.callId, type: 'function', function: { name: part.name, arguments: JSON.stringify(part.input) } });
        } else if (part instanceof vscode.LanguageModelToolResultPart && !assistant) {
          results.push({ role: 'tool', tool_call_id: part.callId, content: textContent(part.content) });
        } else {
          throw new Error('Für diesen Inhaltstyp unterstützt KI:connect nur Textnachrichten; Bilder oder falsch zugeordnete Werkzeugnachrichten werden nicht unterstützt.');
        }
      }
      // Werkzeugergebnisse müssen direkt auf die Aufrufe folgen, noch vor einer neuen Nutzernachricht.
      converted.push(...results);
      if (text.length || calls.length || !results.length) {
        const entry: ChatMessage = { role: assistant ? 'assistant' : 'user', content: textContent(text) };
        if (calls.length) entry.tool_calls = calls;
        converted.push(entry);
      }
    }
    return converted;
  }

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    const key = await this.context.secrets.get(SECRET_KEY);
    if (!key) throw new Error('Führe zuerst „KI:connect: API-Schlüssel hinterlegen“ aus.');
    const tools = options.tools ?? [];
    if (options.toolMode === vscode.LanguageModelChatToolMode.Required && !tools.length) {
      throw new Error('Der Modus für erforderliche Werkzeugaufrufe benötigt mindestens ein Werkzeug.');
    }
    if (tools.length && model.capabilities?.toolCalling === false) {
      throw new Error('Dieses KI:connect-Modell unterstützt keine Werkzeugaufrufe. Wähle ein Modell mit Werkzeugunterstützung.');
    }
    const requestOptions: ChatOptions = tools.length ? {
      tools: tools.map(tool => ({ type: 'function', function: {
        name: tool.name, description: tool.description,
        parameters: tool.inputSchema ?? { type: 'object', properties: {} },
      } })),
      tool_choice: options.toolMode === vscode.LanguageModelChatToolMode.Required ? 'required' : 'auto',
    } : {};
    if (model.maxOutputTokens > 0) requestOptions.max_tokens = model.maxOutputTokens;
    const converted = this.convertMessages(messages);
    await this.withCancellation(token, async signal => {
      for await (const chunk of new KIConnectAPI(key).chat(model.id, converted, signal, requestOptions)) {
        if (token.isCancellationRequested) throw new vscode.CancellationError();
        progress.report(typeof chunk === 'string'
          ? new vscode.LanguageModelTextPart(chunk)
          : new vscode.LanguageModelToolCallPart(chunk.callId, chunk.name, chunk.input));
      }
    });
  }

  async provideTokenCount(_model: vscode.LanguageModelChatInformation, text: string | vscode.LanguageModelChatRequestMessage, _token: vscode.CancellationToken): Promise<number> {
    const content = typeof text === 'string' ? text : JSON.stringify(this.convertMessages([text]));
    const count = countTokens(content);
    // Harmony-Texttokenizer für GPT-OSS; bei anderen Familien Referenzzählung mit Reserve.
    const textTokens = /gpt[-_ ]?oss/i.test(_model.id ?? '') ? count : Math.ceil(count * 1.1);
    return textTokens + (typeof text === 'string' ? 0 : 8);
  }
}
