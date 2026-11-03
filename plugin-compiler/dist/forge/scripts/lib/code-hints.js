'use strict';

// Mechanische Code-Hinweise des Implementierungs-Reviews aus dem Diff `<base>..HEAD`, alle 🟡 (Kandidaten, kein Urteil):
// verschluckte Fehler, Secret-Muster und Dateien, die der Bereich um mehr als 500 Zeilen wachsen lässt.
// Ausgegeben im Findings-Format des Reviewers `skript`; Secrets erscheinen nie im Zitat.

const { spawnSync } = require('node:child_process');
const { isProductionFile } = require('./implementation-report');

const MAX_ADDED_LINES = 500;
const CODE_FILE = /\.(?:[cm]?[jt]sx?|cs)$/i;
const LOCK_OR_GENERATED = /(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock)$|\.min\.[a-z]+$/i;
const COMMENTS = '(?:\\s*(?:\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/))*\\s*';
const CATCH_HEAD = '\\bcatch\\s*(?:\\([^)]*\\))?\\s*\\{';
const EMPTY_CATCH = new RegExp(`${CATCH_HEAD}${COMMENTS}\\}`, 'g');
const SUBSTITUTE_CATCH = new RegExp(`${CATCH_HEAD}\\s*return(?:\\s+(?:\\[\\]|\\{\\}|null|undefined|false|true|0|''|""))?\\s*;?\\s*\\}`, 'g');
const SECRETS = [
  { name: 'AWS-Zugangsschlüssel', pattern: /AKIA(?=[0-9A-Z]{16})/ },
  { name: 'privater Schlüssel', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Passwort im Klartext', pattern: /password\s*=\s*['"]/i },
];

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, '-c', 'core.quotepath=false', ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${(result.stderr ?? '').trim()}`);
  return result.stdout;
}

// Hinzugefügte Zeilen je Datei aus `git diff -U0`: Map Pfad → Liste von Bereichen [von, bis].
function addedRanges(repo, base) {
  const ranges = new Map();
  let file = null;
  for (const line of git(repo, ['diff', '-U0', '--no-color', '--no-renames', '--diff-filter=AM', `${base}..HEAD`]).split('\n')) {
    const header = /^\+\+\+ b\/(.+?)\t?$/.exec(line);
    if (header) {
      file = header[1];
      ranges.set(file, []);
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && file) {
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      if (count > 0) ranges.get(file).push([Number(hunk[1]), Number(hunk[1]) + count - 1]);
    }
  }
  return ranges;
}

function isAdded(ranges, number) {
  return ranges.some(([from, to]) => number >= from && number <= to);
}

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

function shortQuote(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function hint(location, quote, consequence, rationale) {
  return { location, quote, severity: 'yellow', consequence, rationale: `Skript-Prüfung Code-Hinweis: ${rationale}` };
}

function swallowedErrors(file, text, ranges) {
  if (!CODE_FILE.test(file)) return [];
  const found = [];
  for (const pattern of [EMPTY_CATCH, SUBSTITUTE_CATCH]) {
    for (const match of text.matchAll(pattern)) {
      const number = lineOf(text, match.index);
      if (isAdded(ranges, number)) {
        found.push(hint(`${file}:${number}`, shortQuote(match[0]), 'Ein Fehler wird verschluckt: Der Aufrufer erfährt nicht, dass etwas schiefging.', 'verschluckter Fehler (leerer catch oder Ersatzwert)'));
      }
    }
  }
  return found;
}

function secrets(file, text, ranges) {
  if (!isProductionFile(file) || LOCK_OR_GENERATED.test(file)) return [];
  const found = [];
  text.split('\n').forEach((line, index) => {
    if (!isAdded(ranges, index + 1)) return;
    for (const secret of SECRETS) {
      const match = secret.pattern.exec(line);
      if (match) found.push(hint(`${file}:${index + 1}`, match[0], `Die Zeile enthält ein Muster für einen ${secret.name}; Geheimnisse gehören nicht in den Code.`, secret.name));
    }
  });
  return found;
}

function growth(repo, base) {
  return git(repo, ['diff', '--numstat', '--no-renames', `${base}..HEAD`]).split('\n').filter(Boolean).map((line) => line.split('\t'))
    .filter(([added, , file]) => /^\d+$/.test(added) && Number(added) > MAX_ADDED_LINES && isProductionFile(file) && !LOCK_OR_GENERATED.test(file))
    .map(([added, , file]) => ({ file, added: Number(added) }));
}

function firstLine(repo, file) {
  try {
    return shortQuote(git(repo, ['show', `HEAD:${file}`]).split('\n').find((line) => line.trim() !== '') ?? file);
  } catch {
    return file;
  }
}

// Secret-Muster gelten nur in Produktivdateien (weder Test noch Dokument); verschluckte Fehler in jeder JS-, TS- und C#-Datei.
// Befunde der Hinweise für den Bereich `<base>..HEAD` im Repo: [{ location, quote, severity: 'yellow', consequence, rationale }].
function codeHints(repo, base) {
  const ranges = addedRanges(repo, base);
  const found = [];
  for (const [file, fileRanges] of ranges) {
    if (fileRanges.length === 0) continue;
    let text;
    try {
      text = git(repo, ['show', `HEAD:${file}`]);
    } catch {
      continue;
    }
    found.push(...swallowedErrors(file, text, fileRanges), ...secrets(file, text, fileRanges));
  }
  for (const entry of growth(repo, base)) {
    found.push(hint(entry.file, firstLine(repo, entry.file), `Der Bereich fügt der Datei ${entry.added} Zeilen hinzu (mehr als ${MAX_ADDED_LINES}); sie wächst stark.`, 'Dateien über 500 hinzugefügte Zeilen'));
  }
  return found;
}

module.exports = { codeHints, addedRanges, MAX_ADDED_LINES };
