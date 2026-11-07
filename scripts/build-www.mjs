import fs from 'node:fs';
import path from 'node:path';
// Düz HTML projesini www/ klasörüne kopyalar (Capacitor'un webDir'i).
// Web görsellerini assets/ DIŞINDA tut (assets/ yalnızca simge ve açılış ekranı içindir).
const skipDirs = new Set(['node_modules', 'android', 'ios', 'www', '.git', '.github', 'assets', 'scripts', 'dist', 'build']);
const skipFiles = new Set(['package.json', 'package-lock.json', 'capacitor.config.json', '.gitignore', 'README.md']);
fs.rmSync('www', { recursive: true, force: true });
fs.mkdirSync('www');
for (const e of fs.readdirSync('.', { withFileTypes: true })) {
  if (e.isDirectory() ? skipDirs.has(e.name) : skipFiles.has(e.name)) continue;
  fs.cpSync(e.name, path.join('www', e.name), { recursive: true });
}
if (!fs.existsSync('www/index.html')) { console.error('index.html bulunamadi'); process.exit(1); }
console.log('www hazir:', fs.readdirSync('www').join(', '));
