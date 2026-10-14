const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
class TextPart { constructor(value) { this.value = value; } }
class ToolCallPart { constructor(callId, name, input) { Object.assign(this, { callId, name, input }); } }
class ToolResultPart { constructor(callId, content) { Object.assign(this, { callId, content }); } }
class EventEmitter { constructor() { this.listeners = []; this.event = fn => { this.listeners.push(fn); return { dispose() {} }; }; } fire() { this.listeners.forEach(fn => fn()); } dispose() {} }
const vscode = { LanguageModelToolCallPart: ToolCallPart, LanguageModelToolResultPart: ToolResultPart, LanguageModelChatToolMode: { Auto: 1, Required: 2 }, LanguageModelTextPart: TextPart, LanguageModelChatMessageRole: { User: 1, Assistant: 2 }, EventEmitter, CancellationError: class extends Error {} };
const load = Module._load;
Module._load = function(id, ...args) { return id === 'vscode' ? vscode : load.call(this, id, ...args); };
const { KIConnectAPI } = require('../out/api');
const { KIConnectChatProvider } = require('../out/provider');
const token = { isCancellationRequested: false, onCancellationRequested() { return { dispose() {} }; } };
const context = { secrets: { async get() { return 'secret'; } } };
function streamResponse(parts) { return new Response(new ReadableStream({ start(c) { for (const part of parts) c.enqueue(new TextEncoder().encode(part)); c.close(); } })); }

test('API verarbeitet geteilte SSE-Fragmente einschließlich eines Abschlusses ohne Zeilenumbruch', async () => {
  const old = global.fetch;
  global.fetch = async () => streamResponse(['data: {"choices":[{"delta":{"content":"Hal', 'lo"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" Welt"}}]}']);
  try { const result = []; for await (const chunk of new KIConnectAPI('key').chat('m', [])) result.push(chunk); assert.deepEqual(result, ['Hallo', ' Welt']); } finally { global.fetch = old; }
});

test('Provider gibt Antworten aus und überträgt Verlauf sowie ausgewähltes Modell', async () => {
  const old = global.fetch; let body;
  global.fetch = async (_url, init) => { body = JSON.parse(init.body); return streamResponse(['data: {"choices":[{"delta":{"content":"Antwort"}}]}\n\ndata: [DONE]\n\n']); };
  try {
    const parts = [];
    await new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'selected' }, [
      { role: 1, content: [new TextPart('Frage')] }, { role: 2, content: [new TextPart('Alt')] }, { role: 1, content: [new TextPart('Weiter')] }
    ], {}, { report(p) { parts.push(p.value); } }, token);
    assert.deepEqual(parts, ['Antwort']); assert.equal(body.model, 'selected');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Frage' }, { role: 'assistant', content: 'Alt' }, { role: 'user', content: 'Weiter' }]);
  } finally { global.fetch = old; }
});

test('Modellabfrage liefert Metadaten und blendet Modelle ohne Schlüssel aus', async () => {
  const old = global.fetch; global.fetch = async () => Response.json({ data: [{ id: 'm', name: 'Model' }] });
  try {
    const models = await new KIConnectChatProvider(context).provideLanguageModelChatInformation({ silent: true }, token);
    assert.equal(models[0].id, 'm'); assert.ok(models[0].maxInputTokens > 0); assert.equal(models[0].capabilities.toolCalling, false);
    const empty = new KIConnectChatProvider({ secrets: { async get() {} } });
    assert.deepEqual(await empty.provideLanguageModelChatInformation({ silent: true }, token), []);
  } finally { global.fetch = old; }
});

test('API meldet HTTP-Fehler und ungültige Datenströme', async () => {
  const old = global.fetch;
  try {
    global.fetch = async () => new Response('unauthorized', { status: 401 });
    await assert.rejects(async () => { for await (const _ of new KIConnectAPI('key').chat('m', [])) {} }, /401/);
    global.fetch = async () => streamResponse(['data: not-json\n\n']);
    await assert.rejects(async () => { for await (const _ of new KIConnectAPI('key').chat('m', [])) {} }, /Datenstrom|JSON/i);
  } finally { global.fetch = old; }
});

test('Abbruch einer Provider-Anfrage beendet die HTTP-Anfrage', async () => {
  const old = global.fetch; let cancel; let signal;
  const cancellation = { isCancellationRequested: false, onCancellationRequested(fn) { cancel = fn; return { dispose() {} }; } };
  global.fetch = async (_url, init) => { signal = init.signal; return new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))); }); };
  try {
    const pending = new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], {}, { report() {} }, cancellation);
    await new Promise(resolve => setImmediate(resolve)); cancellation.isCancellationRequested = true; cancel();
    await assert.rejects(pending, vscode.CancellationError); assert.equal(signal.aborted, true);
  } finally { global.fetch = old; }
});

test('Aktivierung registriert einen Provider und Schlüsseländerungen aktualisieren die Modellliste', async () => {
  const previousFetch = global.fetch;
  global.fetch = async () => Response.json({ data: [{ id: 'm' }] });
  let change; let refreshed = 0; const commands = new Map(); const registrations = [];
  const secrets = new Map();
  const ctx = { subscriptions: [], secrets: {
    async get(key) { return secrets.get(key); },
    async store(key, value) { secrets.set(key, value); change({ key }); },
    async delete(key) { secrets.delete(key); change({ key }); },
    onDidChange(fn) { change = fn; return { dispose() {} }; },
  } };
  vscode.lm = { registerLanguageModelChatProvider(vendor, provider) { registrations.push({ vendor, provider }); return { dispose() {} }; } };
  vscode.commands = { registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; } };
  vscode.window = { async showInputBox() { return '  key  '; }, showInformationMessage() {} };
  require('../out/extension').activate(ctx);
  assert.equal(registrations.length, 1); assert.equal(registrations[0].vendor, 'kiconnect');
  registrations[0].provider.onDidChangeLanguageModelChatInformation(() => refreshed++);
  await commands.get('kiconnect.setApiKey')(); assert.equal(secrets.get('kiconnect.apiKey'), 'key');
  await commands.get('kiconnect.clearApiKey')(); assert.equal(secrets.size, 0); assert.equal(refreshed, 2);
  global.fetch = previousFetch;
});

test('Provider weist nicht unterstützte Inhalte und fehlende Zugangsdaten vor HTTP-Anfragen zurück', async () => {
  const provider = new KIConnectChatProvider(context);
  await assert.rejects(provider.provideLanguageModelChatResponse({ id: 'm' }, [{ role: 1, content: [{}] }], {}, { report() {} }, token), /nur Textnachrichten/);
  const empty = new KIConnectChatProvider({ secrets: { async get() {} } });
  await assert.rejects(empty.provideLanguageModelChatResponse({ id: 'm' }, [], {}, { report() {} }, token), /API-Schlüssel hinterlegen/);
});

test('Tokenschätzung berücksichtigt Unicode-Bytes zurückhaltend', async () => {
  assert.equal(await new KIConnectChatProvider(context).provideTokenCount({}, 'ä🙂', token), 6);
});

test('Schlüsselprüfung meldet abgelehnte Zugangsdaten und erhält den bisherigen Schlüssel', async () => {
  const old = global.fetch; const commands = new Map(); const errors = []; const infos = []; let writes = 0;
  vscode.lm = { registerLanguageModelChatProvider() { return { dispose() {} }; } };
  vscode.commands = { registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; } };
  vscode.window = { async showInputBox() { return 'invalid'; }, showInformationMessage(m) { infos.push(m); }, showErrorMessage(m) { errors.push(m); } };
  require('../out/extension').activate({ subscriptions: [], secrets: { onDidChange() { return { dispose() {} }; }, async store() { writes++; } } });
  global.fetch = async () => new Response('', { status: 401 });
  try {
    await commands.get('kiconnect.setApiKey')();
    assert.equal(writes, 0); assert.equal(infos.length, 0); assert.match(errors[0], /401/);
  } finally { global.fetch = old; }
});

test('Schlüsselprüfung erklärt eine leere Modellliste', async () => {
  const old = global.fetch; const commands = new Map(); const errors = []; let writes = 0;
  vscode.commands = { registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; } };
  vscode.window = { async showInputBox() { return 'key'; }, showInformationMessage() {}, showErrorMessage(m) { errors.push(m); } };
  require('../out/extension').activate({ subscriptions: [], secrets: { onDidChange() { return { dispose() {} }; }, async store() { writes++; } } });
  global.fetch = async () => Response.json({ data: [] });
  try { await commands.get('kiconnect.setApiKey')(); assert.equal(writes, 0); assert.match(errors[0], /keine Modelle/); } finally { global.fetch = old; }
});

test('Chat öffnen wählt ein KI:connect-Modell und öffnet Ask mit expliziter Modellkennung', async () => {
  const old = global.fetch; const commands = new Map(); const calls = [];
  vscode.commands = {
    registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; },
    async executeCommand(...args) { calls.push(args); },
  };
  vscode.window = {
    async showQuickPick(items) { assert.equal(items.length, 1); return items[0]; },
    showErrorMessage(message) { assert.fail(message); },
  };
  require('../out/extension').activate({ subscriptions: [], secrets: { async get() { return 'key'; }, onDidChange() { return { dispose() {} }; } } });
  global.fetch = async () => Response.json({ data: [{ id: 'chat-model', name: 'Chat Model' }, { id: 'embedding-model' }] });
  try {
    assert.ok(commands.has('kiconnect.openChat'), 'Der Befehl zum Öffnen des Chats muss registriert sein');
    await commands.get('kiconnect.openChat')();
    assert.deepEqual(calls, [['workbench.action.chat.open', { mode: 'ask', modelSelector: { vendor: 'kiconnect', id: 'chat-model' } }]]);
  } finally { global.fetch = old; }
});

function sse(delta, finish_reason = null) { return `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason }] })}\n\n`; }

test('Modellabfrage aktiviert Werkzeuge für geeignete Modelle und beachtet explizite Ablehnungen', async () => {
  const old = global.fetch;
  global.fetch = async () => Response.json({ data: [
    { id: 'GPT-OSS-120B' }, { id: 'mistralai-mistral-small-4' }, { id: 'Qwen3.8 27B' }, { id: 'E5-Mistral-7B-Instruct' },
    { id: 'custom', info: { meta: { capabilities: { function_calling: true } } } },
    { id: 'gpt-oss-disabled', capabilities: { toolCalling: false } },
  ] });
  try {
    const models = await new KIConnectChatProvider(context).provideLanguageModelChatInformation({}, token);
    assert.deepEqual(models.map(m => m.capabilities.toolCalling), [true, true, true, false, true, false]);
  } finally { global.fetch = old; }
});

test('Agent-Anfrage überträgt Werkzeuge und setzt fragmentierte parallele Aufrufe zusammen', async () => {
  const old = global.fetch; let body; const parts = [];
  global.fetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return streamResponse([
      sse({ content: 'Ich prüfe das.', tool_calls: [{ index: 0, id: 'call-a', function: { name: 'read_file', arguments: '{"path":' } }, { index: 1, id: 'call-b', function: { name: 'list_files', arguments: '{' } }] }),
      sse({ tool_calls: [{ index: 1, function: { arguments: '}' } }, { index: 0, function: { arguments: '"README.md"}' } }] }, 'tool_calls'), 'data: [DONE]\n\n',
    ]);
  };
  try {
    await new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'GPT-OSS-120B', capabilities: { toolCalling: true } }, [], {
      toolMode: 2, tools: [{ name: 'read_file', description: 'Read file', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } }, { name: 'list_files', description: 'List files' }],
    }, { report(part) { parts.push(part); } }, token);
    assert.equal(body.tool_choice, 'required'); assert.equal(body.tools[0].function.parameters.type, 'object');
    assert.deepEqual(parts, [new TextPart('Ich prüfe das.'), new ToolCallPart('call-a', 'read_file', { path: 'README.md' }), new ToolCallPart('call-b', 'list_files', {})]);
  } finally { global.fetch = old; }
});

test('Werkzeugergebnisse und Assistentenaufrufe bleiben in der nächsten Gesprächsrunde erhalten', async () => {
  const old = global.fetch; let body;
  global.fetch = async (_url, init) => { body = JSON.parse(init.body); return streamResponse([sse({ content: 'Fertig' }), 'data: [DONE]\n\n']); };
  try {
    await new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'GPT-OSS-120B' }, [
      { role: 2, content: [new TextPart('Lese Datei'), new ToolCallPart('a', 'read_file', { path: 'a.ts' }), new ToolCallPart('b', 'list_files', {})] },
      { role: 1, content: [new ToolResultPart('a', [new TextPart('Inhalt')]), new ToolResultPart('b', [new TextPart('a.ts')]), new TextPart('Weiter')] },
    ], {}, { report() {} }, token);
    assert.deepEqual(body.messages, [
      { role: 'assistant', content: 'Lese Datei', tool_calls: [{ id: 'a', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.ts"}' } }, { id: 'b', type: 'function', function: { name: 'list_files', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'a', content: 'Inhalt' }, { role: 'tool', tool_call_id: 'b', content: 'a.ts' }, { role: 'user', content: 'Weiter' },
    ]);
    assert.ok(await new KIConnectChatProvider(context).provideTokenCount({}, { role: 2, content: [new ToolCallPart('a', 'read_file', { path: 'a.ts' })] }, token) > 0);
  } finally { global.fetch = old; }
});

test('Ungültige Werkzeugargumente führen zu einem Fehler ohne Werkzeugaufruf', async () => {
  const old = global.fetch; const parts = [];
  global.fetch = async () => streamResponse([sse({ tool_calls: [{ index: 0, id: 'a', function: { name: 'read_file', arguments: '{broken' } }] }, 'tool_calls'), 'data: [DONE]\n\n']);
  try {
    await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }] }, { report(p) { parts.push(p); } }, token), /JSON|Argument/i);
    assert.equal(parts.length, 0);
  } finally { global.fetch = old; }
});

test('Erforderliche Werkzeugauswahl weist eine leere Liste vor der HTTP-Anfrage zurück', async () => {
  await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [], toolMode: 2 }, { report() {} }, token), /Werkzeug/i);
});

test('Abbruch während fragmentierter Werkzeugargumente gibt keinen Aufruf aus', async () => {
  const old = global.fetch; let cancel; const parts = [];
  const cancellation = { isCancellationRequested: false, onCancellationRequested(fn) { cancel = fn; return { dispose() {} }; } };
  global.fetch = async (_url, init) => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(sse({ tool_calls: [{ index: 0, id: 'a', function: { name: 'read_file', arguments: '{"path":' } }] })));
    init.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
  } }));
  try {
    const pending = new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }] }, { report(p) { parts.push(p); } }, cancellation);
    await new Promise(resolve => setImmediate(resolve)); cancellation.isCancellationRequested = true; cancel();
    await assert.rejects(pending, vscode.CancellationError); assert.deepEqual(parts, []);
  } finally { global.fetch = old; }
});

test('Unbekannte Werkzeuge und abgeschnittene Argumente werden ohne Aufruf zurückgewiesen', async () => {
  const old = global.fetch;
  try {
    for (const [name, ending, error] of [['unknown', 'tool_calls', /nicht verfügbares Werkzeug/], ['read_file', 'length', /length/]]) {
      const parts = [];
      global.fetch = async () => streamResponse([sse({ tool_calls: [{ index: 0, id: 'a', function: { name, arguments: '{}' } }] }, ending)]);
      await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }] }, { report(p) { parts.push(p); } }, token), error);
      assert.deepEqual(parts, []);
    }
  } finally { global.fetch = old; }
});

test('Erforderliche Werkzeugauswahl meldet eine reine Textantwort als Fehler', async () => {
  const old = global.fetch;
  global.fetch = async () => streamResponse([sse({ content: 'Nur Text' }, 'stop'), 'data: [DONE]\n\n']);
  try {
    await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }], toolMode: 2 }, { report() {} }, token), /erforderlichen Werkzeugaufruf/);
  } finally { global.fetch = old; }
});

test('Ein Datenstromende ohne Abschluss gibt keinen offenen Werkzeugaufruf aus', async () => {
  const old = global.fetch; const parts = [];
  global.fetch = async () => streamResponse([sse({ tool_calls: [{ index: 0, id: 'a', function: { name: 'read_file', arguments: '{}' } }] })]);
  try {
    await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }] }, { report(p) { parts.push(p); } }, token), /unvollständigen Werkzeugaufruf/);
    assert.deepEqual(parts, []);
  } finally { global.fetch = old; }
});

test('Werkzeugargumente müssen Objekte sein und dürfen weder null noch Arrays sein', async () => {
  const old = global.fetch;
  try {
    for (const input of ['null', '[]']) {
      const parts = [];
      global.fetch = async () => streamResponse([sse({ tool_calls: [{ index: 0, id: 'a', function: { name: 'read_file', arguments: input } }] }, 'tool_calls')]);
      await assert.rejects(new KIConnectChatProvider(context).provideLanguageModelChatResponse({ id: 'm' }, [], { tools: [{ name: 'read_file' }] }, { report(p) { parts.push(p); } }, token), /JSON-Objekt/);
      assert.deepEqual(parts, []);
    }
  } finally { global.fetch = old; }
});
