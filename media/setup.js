const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
let models = [];
let pending = false;
function step(index) {
  ['welcome', 'credentials', 'ready'].forEach((id, i) => { $(id).hidden = i !== index; });
  document.querySelectorAll('nav li').forEach((item, i) => {
    if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    item.classList.toggle('done', i < index);
  });
  $('progress').textContent = `Schritt ${index + 1} von 3`;
  $('status').textContent = '';
  $(index === 1 ? 'key' : index === 2 ? 'model' : 'start').focus();
}
function busy(value) {
  pending = value;
  ['validate', 'open-chat', 'back', 'change-key', 'key', 'model', 'visibility'].forEach(id => { $(id).disabled = value; });
  $('key-form').setAttribute('aria-busy', String(value));
}
$('start').onclick = () => step(1);
$('back').onclick = () => step(0);
$('change-key').onclick = () => step(1);
$('skip').onclick = () => vscode.postMessage({ type: 'skip' });
$('account').onclick = () => vscode.postMessage({ type: 'account' });
$('visibility').onclick = () => {
  const visible = $('key').type === 'password';
  $('key').type = visible ? 'text' : 'password';
  $('visibility').textContent = visible ? 'Verbergen' : 'Anzeigen';
  $('visibility').setAttribute('aria-pressed', String(visible));
};
$('key-form').onsubmit = event => {
  event.preventDefault(); if (pending) return;
  const key = $('key').value.trim();
  if (!key) { $('key').focus(); return; }
  busy(true); $('status').textContent = 'Zugang wird geprüft …';
  vscode.postMessage({ type: 'validate', key });
};
function capability() {
  const model = models.find(m => m.id === $('model').value);
  $('capability').textContent = model?.toolCalling
    ? 'Dieses Modell unterstützt Werkzeuge. Du kannst im integrierten Chat auch den Agent-Modus auswählen.'
    : 'Dieses Modell ist für Textchats verfügbar. Der integrierte Chat öffnet sich im Ask-Modus.';
}
$('model').onchange = capability;
$('open-chat').onclick = () => {
  if (pending) return;
  busy(true); $('status').textContent = 'Chat wird geöffnet …';
  vscode.postMessage({ type: 'openChat', modelId: $('model').value });
};
window.addEventListener('message', ({ data }) => {
  if (data.type === 'models') {
    models = data.models;
    $('key').value = ''; $('key').type = 'password';
    $('visibility').textContent = 'Anzeigen'; $('visibility').setAttribute('aria-pressed', 'false');
    $('model').replaceChildren(...models.map(model => {
      const option = document.createElement('option'); option.value = model.id; option.textContent = model.name; return option;
    }));
    $('model-count').textContent = `${models.length} ${models.length === 1 ? 'Chatmodell ist' : 'Chatmodelle sind'} für deinen Schlüssel verfügbar. Wähle dein Modell für den ersten Chat.`;
    busy(false); step(2); capability();
  } else if (data.type === 'error') {
    busy(false); $('status').textContent = data.message;
  }
});
