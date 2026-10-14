import fetch, { RequestInit, Response } from 'node-fetch';

/**
 * Minimal client for the KI:connect OpenAI‑compatible API.
 * The base URL is taken from the public documentation – adjust if it changes.
 */
export class KIConnectAPI {
  private readonly baseUrl: string = 'https://chat.kiconnect.nrw/api/v1';
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  /** Helper to perform an authenticated request */
  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers as any),
      },
    });
    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`KIConnect API error ${response.status}: ${errTxt}`);
    }
    return (await response.json()) as T;
  }

  /** Retrieve the list of available models */
  async getModels(): Promise<Array<{ id: string; name: string }>> {
    // Assuming the endpoint returns { data: [{ id, object }...] } similar to OpenAI
    const result = await this.request<any>('models');
    // Transform to simple {id, name}
    return result.data.map((m: any) => ({ id: m.id, name: m.id }));
  }

  /** Send a chat request and return a streamed async iterator of strings */
  async *chat(modelId: string, messages: Array<{ role: string; content: string }>): AsyncIterableIterator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // split on newlines, each line prefixed with "data: "
      const lines = buffer.split(/\r?\n/);
      // keep incomplete last line
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return;
          try {
            const parsed = JSON.parse(payload);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // ignore malformed lines
          }
        }
      }
    }
  }
}
