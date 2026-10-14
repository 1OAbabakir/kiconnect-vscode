import * as vscode from 'vscode';
import { KIConnectAPI } from './api';

/**
 * Implements the VS Code LanguageModelChatProvider API.
 * It forwards chat messages to KI:connect and streams the response back.
 */
export class KIConnectChatProvider {
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /** Load the stored API key */
  private async getApiKey(): Promise<string | undefined> {
    return this.context.secrets.get('kiconnect.apiKey');
  }

  /** Provide chat model information – required by the LanguageModelChatProvider interface */
  async provideLanguageModelChatInformation(
    _options: any,
    _token: vscode.CancellationToken
  ): Promise<any[]> {
    // No additional model info needed here; models are registered individually.
    return [];
  }

  async sendRequest(
      request: any,
      _context: any,
      token: vscode.CancellationToken
  ): Promise<any> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('KI:connect API key not configured – run the "Set API Key" command.');
    }
    const api = new KIConnectAPI(apiKey);
    const modelId = request.model;

    // Build a minimal messages array for the API.
    // We include an optional empty system prompt and the user's current prompt.
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: '' },
      { role: 'user', content: request.prompt },
    ];

    // Create a response object that streams data back to VS Code.
    const response: any = { stream: { append: (s: string) => {}, end: () => {} } };
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
      } catch (e: any) {
        response.stream.append(`\n[Error] ${e.message}`);
        response.stream.end();
      }
    })();
    return response;
  }
}
