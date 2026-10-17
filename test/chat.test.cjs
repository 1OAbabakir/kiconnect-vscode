const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
class TextPart { constructor(value) { this.value = value; } }
class ToolCallPart { constructor(callId, name, input) { Object.assign(this, { callId, name, input }); } }
class ToolResultPart { constructor(callId, content) { Object.assign(this, { callId, content }); } }
class EventEmitter { constructor() { this.listeners = []; this.event = fn => { this.listeners.push(fn); return { dispose() {} }; }; } fire() { this.listeners.forEach(fn => fn()); } dispose() {} }
const vscode = { LanguageModelToolCallPart: ToolCallPart, LanguageModelToolResultPart: ToolResultPart, LanguageModelChatToolMode: { Auto: 1, Required: 2 }, LanguageModelTextPart: TextPart, LanguageModelChatMessageRole: { User: 1, Assistant: 2 }, EventEmitter, CancellationError: class extends Error {} };
vscode.ViewColumn = { One: 1 };
vscode.Uri = { joinPath(_base, ...parts) { return { toString() { return parts.join('/'); } }; } };
const load = Module._load;
Module._load = function(id, ...args) { return id === 'vscode' ? vscode : load.call(this, id, ...args); };
const { KIConnectAPI } = require('../out/api');
const { KIConnectChatProvider } = require('../out/provider');
const token = { isCancellationRequested: false, onCancellationRequested() { return { dispose() {} }; } };
const context = { secrets: { async get() { return 'secret'; } } };
function activateExtension(ctx) {
  vscode.commands.executeCommand ??= async () => {};
  return require('../out/extension').activate(ctx);
}
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
  activateExtension({ ...ctx, globalState: { get() { return true; }, async update() {} } });
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

test('Tokenzählung verwendet BPE statt Bytes und erkennt auch Unicode', async () => {
  const provider = new KIConnectChatProvider(context);
  assert.equal(await provider.provideTokenCount({ id: 'GPT-OSS-120B' }, 'hello world', token), 2);
  assert.equal(await provider.provideTokenCount({ id: 'GPT-OSS-120B' }, 'ä🙂', token), 2);
  assert.equal(await provider.provideTokenCount({}, '', token), 0);
  assert.equal(await provider.provideTokenCount({ id: 'GPT-OSS-120B' }, 'hello world '.repeat(10000), token), 20001);
});

test('Schlüsselprüfung meldet abgelehnte Zugangsdaten und erhält den bisherigen Schlüssel', async () => {
  const old = global.fetch; const commands = new Map(); const errors = []; const infos = []; let writes = 0;
  vscode.lm = { registerLanguageModelChatProvider() { return { dispose() {} }; } };
  vscode.commands = { registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; } };
  vscode.window = { async showInputBox() { return 'invalid'; }, showInformationMessage(m) { infos.push(m); }, showErrorMessage(m) { errors.push(m); } };
  activateExtension({ globalState: { get() { return true; }, async update() {} }, subscriptions: [], secrets: { onDidChange() { return { dispose() {} }; }, async store() { writes++; } } });
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
  activateExtension({ globalState: { get() { return true; }, async update() {} }, subscriptions: [], secrets: { onDidChange() { return { dispose() {} }; }, async store() { writes++; } } });
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
  activateExtension({ globalState: { get() { return true; }, async update() {} }, subscriptions: [], secrets: { async get() { return 'key'; }, onDidChange() { return { dispose() {} }; } } });
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

function onboardingHarness(state = new Map(), key) {
  const panels = []; const commands = new Map(); const stored = new Map(key ? [['kiconnect.apiKey', key]] : []);
  vscode.ViewColumn = { One: 1 };
  vscode.Uri = { joinPath(_base, ...parts) { return { toString() { return parts.join('/'); } }; } };
  vscode.commands = { registerCommand(id, fn) { commands.set(id, fn); return { dispose() {} }; }, async executeCommand(...args) { panels.calls.push(args); } };
  panels.calls = [];
  vscode.window = { createWebviewPanel() {
    const panel = { webview: { cspSource: 'vscode-resource:', asWebviewUri(uri) { return uri; }, html: '', async postMessage(m) { panel.messages.push(m); }, onDidReceiveMessage(fn) { panel.receive = fn; return { dispose() {} }; } }, messages: [], reveal() {}, onDidDispose(fn) { panel.closed = fn; return { dispose() {} }; }, dispose() { panel.closed?.(); } };
    panels.push(panel); return panel;
  } };
  const ctx = { extensionUri: {}, subscriptions: [], globalState: { get(k) { return state.get(k); }, async update(k, v) { state.set(k, v); } }, secrets: { async get(k) { return stored.get(k); }, async store(k, v) { stored.set(k, v); }, onDidChange() { return { dispose() {} }; } } };
  return { ctx, panels, commands, stored };
}

test('Einrichtung öffnet einmal automatisch und lässt sich erneut starten', async () => {
  const state = new Map(); let h = onboardingHarness(state);
  await activateExtension(h.ctx);
  assert.equal(h.panels.length, 1);
  assert.match(h.panels[0].webview.html, /Content-Security-Policy/);
  h = onboardingHarness(state); await activateExtension(h.ctx);
  assert.equal(h.panels.length, 0);
  await h.commands.get('kiconnect.startSetup')(); assert.equal(h.panels.length, 1);
  await h.commands.get('kiconnect.startSetup')(); assert.equal(h.panels.length, 1);
});

test('Einrichtung speichert nur geprüfte Schlüssel und öffnet nur angebotene Modelle', async () => {
  const old = global.fetch; const h = onboardingHarness();
  await activateExtension(h.ctx); const panel = h.panels[0];
  try {
    global.fetch = async () => new Response('', { status: 401 });
    await panel.receive({ type: 'validate', key: 'invalid' });
    assert.equal(h.stored.size, 0); assert.equal(panel.messages.at(-1).type, 'error');
    global.fetch = async () => Response.json({ data: [{ id: 'm', name: '<script>bad</script>' }] });
    await panel.receive({ type: 'validate', key: '  secret  ' });
    assert.equal(h.stored.get('kiconnect.apiKey'), 'secret');
    assert.equal(panel.messages.at(-1).type, 'models');
    assert.ok(!JSON.stringify(panel.messages).includes('secret'));
    await panel.receive({ type: 'openChat', modelId: 'unknown' }); assert.equal(h.panels.calls.length, 0);
    await panel.receive({ type: 'openChat', modelId: 'm' });
    assert.deepEqual(h.panels.calls.at(-1), ['kiconnect.openChat', 'm']);
  } finally { global.fetch = old; }
});

test('Einrichtung erhält vorhandene Schlüssel bei leeren Modellfreigaben und lässt sich überspringen', async () => {
  const old = global.fetch; const state = new Map(); const h = onboardingHarness(state, 'previous');
  await activateExtension(h.ctx); const panel = h.panels[0];
  try {
    global.fetch = async () => Response.json({ data: [] });
    await panel.receive({ type: 'validate', key: 'new-key' });
    assert.equal(h.stored.get('kiconnect.apiKey'), 'previous');
    assert.match(panel.messages.at(-1).message, /keine Chatmodelle/);
    await panel.receive({ type: 'skip' });
    assert.equal(state.get('kiconnect.setupCompleted'), undefined);
    await h.commands.get('kiconnect.startSetup')(); assert.equal(h.panels.length, 2);
  } finally { global.fetch = old; }
});

test('Modellbudgets verwenden API-Grenzen und reservieren Platz für die Antwort', async () => {
  const old = global.fetch;
  global.fetch = async () => Response.json({ data: [
    { id: 'large', context_length: 131072, max_output_tokens: 16384 },
    { id: 'small', context_length: 4096 },
    { id: 'nested', info: { meta: { context_length: 65536, max_output_tokens: 4096 } } },
    { id: 'unknown', context_length: -1, max_output_tokens: 'invalid' },
  ] });
  try {
    const models = await new KIConnectChatProvider(context).provideLanguageModelChatInformation({}, token);
    assert.equal(models[0].maxInputTokens, 114688); assert.equal(models[0].maxOutputTokens, 16384);
    assert.ok(models[1].maxInputTokens > 0);
    assert.equal(models[1].maxInputTokens + models[1].maxOutputTokens, 4096);
    assert.equal(models[2].maxInputTokens, 61440);
    assert.equal(models[3].maxInputTokens, 122880); assert.equal(models[3].maxOutputTokens, 8192);
  } finally { global.fetch = old; }
});


test('Integrierter Chat öffnet das angegebene Modell ohne zweite Modellauswahl und merkt es', async () => {
  const old = global.fetch; const h = onboardingHarness(new Map([['kiconnect.setupShown', true]]), 'key');
  await activateExtension(h.ctx);
  global.fetch = async () => Response.json({ data: [{ id: 'm', name: 'Modell' }] });
  try {
    await h.commands.get('kiconnect.openChat')('m');
    assert.deepEqual(h.panels.calls.at(-1), ['workbench.action.chat.open', { mode: 'ask', modelSelector: { vendor: 'kiconnect', id: 'm' } }]);
    assert.equal(h.ctx.globalState.get('kiconnect.selectedModel'), 'm');
  } finally { global.fetch = old; }
});

test('Neuladen öffnet den integrierten Chat mit dem zuletzt gewählten Modell', async () => {
  const old = global.fetch;
  const state = new Map([['kiconnect.setupShown', true], ['kiconnect.selectedModel', 'm']]);
  const h = onboardingHarness(state, 'key');
  global.fetch = async () => Response.json({ data: [{ id: 'm' }] });
  try {
    await activateExtension(h.ctx);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(h.panels.calls, [['workbench.action.chat.open', { mode: 'ask', modelSelector: { vendor: 'kiconnect', id: 'm' } }]]);
    assert.equal(h.panels.length, 0);
  } finally { global.fetch = old; }
});

test('Tokenizer-Daten entsprechen dem offiziellen o200k-Rangbestand', () => {
  const { createHash } = require('node:crypto');
  const vocabulary = require('../out/tokenizer/o200k.json');
  const hash = createHash('sha256');
  vocabulary.forEach((value, rank) => hash.update(`${value} ${rank}\n`));
  assert.equal(vocabulary.length, 199998);
  assert.equal(hash.digest('hex'), '446a9538cb6c348e3516120d7c08b09f57c36495e2acfffe59a5bf8b0cfb1a2d');
});

test('Tokenzählung berücksichtigt Werkzeugergebnisse und lange Codebezeichner', async () => {
  const provider = new KIConnectChatProvider(context);
  const model = { id: 'GPT-OSS-120B' };
  const text = 'function '.repeat(2000);
  const counted = await provider.provideTokenCount(model, { role: 1, content: [new ToolResultPart('a', [new TextPart(text)])] }, token);
  assert.ok(counted >= 2000 && counted < 4000);
  const long = await provider.provideTokenCount(model, 'abcXYZ'.repeat(10000), token);
  assert.ok(long > 0 && long < 60000);
  assert.ok(await provider.provideTokenCount(model, '<|start|> Hallo 🙂 مرحبا 你好', token) > 0);
});

test('Explizite API-Eingabegrenzen werden nicht durch das Standardbudget verkleinert', () => {
  const { tokenBudget } = require('../out/models');
  assert.deepEqual(tokenBudget({ maxInputTokens: 262144, maxOutputTokens: 8192 }), { maxInputTokens: 262144, maxOutputTokens: 8192 });
});
