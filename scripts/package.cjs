// Erstellt ein VSIX mit versioniertem Dateinamen; veröffentlicht nichts im Marketplace.
const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { name, version, publisher } = require('../package.json');
if (publisher === 'your-publisher-id') {
  process.stderr.write('Hinweis: Herausgeberkonto noch offen. Dieses Paket ist nur eine lokale Vorschau.\n');
}
mkdirSync('dist', { recursive: true });
const vsce = require.resolve('@vscode/vsce/vsce');
const result = spawnSync(process.execPath, [vsce, 'package', '--no-dependencies', '--out', `dist/${name}-${version}.vsix`], { stdio: 'inherit' });
if (result.error) {
  process.stderr.write(`Paketierung fehlgeschlagen: ${result.error.message}\n`);
}
process.exit(result.status ?? 1);
