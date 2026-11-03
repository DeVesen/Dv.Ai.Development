'use strict';

// Sensoren der Plugin-Druckerei.
//   pre:  Edit oder Write in die gedruckte Ausgabe eines Projekts (dist/) → blockieren (Exit 2): Änderungen gehören in src/.
//   post: nach Edit oder Write in src/ eines Projekts → Schnellprüfung (druckerei pruefen --schnell); Fehler gehen mit Exit 2
//         an Claude zurück, damit das Ausfüllen sofort korrigiert wird.
// Ein Fehler im Sensor selbst blockiert nie (Exit 0).

const fs = require('node:fs');
const path = require('node:path');
const { runPython } = require('./python.js');

const PROJECT_FILE = 'druckerei.yaml';
const SCRIPT = path.join(__dirname, 'druckerei.py');

function findProject(start) {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, PROJECT_FILE))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function outputDir(root) {
  const text = fs.readFileSync(path.join(root, PROJECT_FILE), 'utf8');
  const match = /^ausgabe:\s*["']?([^"'\n#]+?)["']?\s*$/m.exec(text);
  return path.resolve(root, match ? match[1] : 'dist');
}

function inside(file, dir) {
  const rel = path.relative(dir, file);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function targetOf(input) {
  const tool = input.tool_input ?? {};
  const file = tool.file_path ?? tool.notebook_path ?? tool.path;
  return typeof file === 'string' && file !== '' ? path.resolve(input.cwd ?? process.cwd(), file) : null;
}

// Begründung, warum der Aufruf blockiert wird, oder null.
function decide(mode, input) {
  const file = targetOf(input);
  if (!file) return null;
  const root = findProject(path.dirname(file));
  if (!root) return null;
  if (mode === 'pre') {
    const out = outputDir(root);
    return inside(file, out)
      ? `druckerei: ${path.relative(root, file)} ist gedruckt und wird beim nächsten Druck überschrieben. Ändere die Quelle unter src/ und prüfe mit druckerei pruefen.`
      : null;
  }
  if (!inside(file, path.join(root, 'src'))) return null;
  const result = runPython(SCRIPT, ['pruefen', '--schnell', '--projekt', root], { timeout: 50000 });
  if (result.missing || result.status === 0 || result.status === null) return null;
  const lines = String(result.stdout).split('\n').filter((line) => /FEHLER|fehlgeschlagen/.test(line)).slice(0, 12);
  return `druckerei: Die Schnellprüfung nach deiner Änderung meldet Probleme. Behebe sie, bevor du weitermachst:\n${lines.join('\n')}`;
}

if (require.main === module) {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    const reason = decide(process.argv[2], raw.trim() ? JSON.parse(raw) : {});
    if (reason) {
      process.stderr.write(`${reason}\n`);
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(`druckerei hook: ${error.message}\n`);
  }
  process.exit(0);
}

module.exports = { decide, findProject, inside };
